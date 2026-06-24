import { useState } from 'react'
import { addPlaylistSong, deletePlaylistSong, updatePlaylistSong } from '../firebase/firestore'
import { getPartnerToken, sendPushNotification } from '../firebase/fcm'

function getSongEmbed(url) {
  if (!url) return null
  const ytMatch = url.match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/|shorts\/))([A-Za-z0-9_-]{11})/)
  if (ytMatch) return { type: 'youtube', embedUrl: `https://www.youtube.com/embed/${ytMatch[1]}?rel=0&modestbranding=1` }
  const spMatch = url.match(/spotify\.com\/(track|playlist|album)\/([A-Za-z0-9]+)/)
  if (spMatch) return { type: 'spotify', embedUrl: `https://open.spotify.com/embed/${spMatch[1]}/${spMatch[2]}?utm_source=generator&theme=0` }
  return null
}

function getDomain(url) {
  try { return new URL(url).hostname.replace('www.', '') } catch { return url }
}

export default function PlaylistTab({ currentUser, playlist }) {
  const [url, setUrl] = useState('')
  const [note, setNote] = useState('')
  const [adding, setAdding] = useState(false)
  const [expandedId, setExpandedId] = useState(null)
  const [listeningId, setListeningId] = useState(null)
  const partner = currentUser === 'M' ? 'N' : 'M'

  const handleAdd = async () => {
    if (!url.trim()) return
    setAdding(true)
    try {
      await addPlaylistSong({
        url: url.trim(),
        note: note.trim(),
        from: currentUser,
        date: new Date().toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' }),
        createdAt: Date.now(),
        hearts: {},
      })
      setUrl(''); setNote('')
    } catch { alert('Could not add song.') }
    setAdding(false)
  }

  const handleHeart = async (song) => {
    const hearts = song.hearts || {}
    const next = { ...hearts, [currentUser]: !hearts[currentUser] }
    await updatePlaylistSong(song.id, { hearts: next })
  }

  const handleListenTogether = async (song) => {
    setListeningId(song.id)
    try {
      const token = await getPartnerToken(partner)
      const songLabel = song.note ? `"${song.note}"` : getDomain(song.url)
      await sendPushNotification({
        toToken: token,
        title: `🎵 ${currentUser} wants to listen together!`,
        body: `Open ${songLabel} and press play at the same time 💗`,
      })
      // Open the song on sender's side too
      window.open(song.url, '_blank')
    } catch { alert('Could not send notification.') }
    setTimeout(() => setListeningId(null), 3000)
  }

  const heartCount = (song) => Object.values(song.hearts || {}).filter(Boolean).length
  const myHeart = (song) => !!(song.hearts || {})[currentUser]

  const sorted = [...(playlist || [])].sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0))

  return (
    <div style={{ flex: 1, padding: 16, overflowY: 'auto' }}>

      {/* Add song */}
      <div className="card">
        <div className="card-title">🎵 Dedicate a song</div>
        <input
          value={url}
          onChange={e => setUrl(e.target.value)}
          placeholder="Paste a Spotify or YouTube link..."
          style={{ width: '100%', background: 'var(--card2)', border: '0.5px solid var(--border)', borderRadius: 8, color: 'var(--text)', padding: '8px 10px', fontSize: 14, marginBottom: 8 }}
        />
        <input
          value={note}
          onChange={e => setNote(e.target.value)}
          placeholder={`Why does this remind you of ${partner}? (optional)`}
          style={{ width: '100%', background: 'var(--card2)', border: '0.5px solid var(--border)', borderRadius: 8, color: 'var(--text)', padding: '8px 10px', fontSize: 14, marginBottom: 8 }}
        />
        <button onClick={handleAdd} disabled={!url.trim() || adding}
          style={{ padding: '10px 20px', background: !url.trim() || adding ? 'var(--card2)' : 'var(--pink)', color: !url.trim() || adding ? 'var(--muted)' : '#fff', border: 'none', borderRadius: 8, cursor: !url.trim() || adding ? 'default' : 'pointer', fontSize: 14, fontWeight: 500 }}>
          {adding ? 'Adding...' : '🎶 Dedicate song'}
        </button>
      </div>

      {/* Listen Together info */}
      <div className="card" style={{ background: 'linear-gradient(135deg, rgba(212,83,126,0.06), rgba(100,48,120,0.06))', border: '0.5px solid rgba(212,83,126,0.2)' }}>
        <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
          <span style={{ fontSize: 22 }}>🎧</span>
          <div>
            <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--text)', marginBottom: 2 }}>Listen Together</div>
            <div style={{ fontSize: 12, color: 'var(--muted)', lineHeight: 1.5 }}>
              Tap "Listen Together" on any song to notify {partner} and open the song on both your phones — then press play at the same time 💗
            </div>
          </div>
        </div>
      </div>

      {/* Playlist */}
      <div className="card">
        <div className="card-title" style={{ display: 'flex', justifyContent: 'space-between' }}>
          <span>🎼 Our playlist</span>
          <span style={{ fontSize: 11, color: 'var(--muted)' }}>{sorted.length} songs</span>
        </div>

        {sorted.length === 0 ? (
          <p style={{ color: 'var(--muted)', fontSize: 13 }}>No songs yet. Dedicate the first one! 🎵</p>
        ) : sorted.map(song => {
          const embed = getSongEmbed(song.url)
          const isExpanded = expandedId === song.id
          const isListening = listeningId === song.id

          return (
            <div key={song.id} style={{ borderBottom: '0.5px solid var(--border)', paddingBottom: 12, marginBottom: 12 }}>

              {/* Song header */}
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                {/* Icon */}
                <div style={{ width: 40, height: 40, borderRadius: 10, background: 'var(--card2)', border: '0.5px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, flexShrink: 0 }}>
                  {embed?.type === 'spotify' ? '🟢' : embed?.type === 'youtube' ? '🔴' : '🎵'}
                </div>

                <div style={{ flex: 1, minWidth: 0 }}>
                  {song.note ? (
                    <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--text)', marginBottom: 2, lineHeight: 1.3 }}>"{song.note}"</div>
                  ) : null}
                  <div style={{ fontSize: 11, color: 'var(--muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {getDomain(song.url)}
                  </div>
                  <div style={{ fontSize: 10, color: 'var(--muted)', marginTop: 2 }}>
                    <span style={{ color: 'var(--pink)', fontWeight: 600 }}>{song.from}</span> · {song.date}
                  </div>
                </div>
              </div>

              {/* Action buttons */}
              <div style={{ display: 'flex', gap: 6, marginTop: 10, flexWrap: 'wrap' }}>
                {/* Heart */}
                <button onClick={() => handleHeart(song)}
                  style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '6px 12px', background: myHeart(song) ? 'rgba(212,83,126,0.15)' : 'var(--card2)', border: `0.5px solid ${myHeart(song) ? 'rgba(212,83,126,0.5)' : 'var(--border)'}`, borderRadius: 20, cursor: 'pointer', fontSize: 12, color: myHeart(song) ? 'var(--pink)' : 'var(--muted)', transition: 'all .15s' }}>
                  {myHeart(song) ? '❤️' : '🤍'} {heartCount(song) > 0 ? heartCount(song) : 'Love it'}
                </button>

                {/* Preview toggle */}
                {embed && (
                  <button onClick={() => setExpandedId(isExpanded ? null : song.id)}
                    style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '6px 12px', background: isExpanded ? 'rgba(212,83,126,0.1)' : 'var(--card2)', border: `0.5px solid ${isExpanded ? 'rgba(212,83,126,0.3)' : 'var(--border)'}`, borderRadius: 20, cursor: 'pointer', fontSize: 12, color: isExpanded ? 'var(--pink)' : 'var(--muted)' }}>
                    {isExpanded ? '▾ Hide' : '▸ Preview'}
                  </button>
                )}

                {/* Listen Together */}
                <button onClick={() => handleListenTogether(song)} disabled={isListening}
                  style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '6px 12px', background: isListening ? 'var(--card2)' : 'var(--pink)', border: 'none', borderRadius: 20, cursor: isListening ? 'default' : 'pointer', fontSize: 12, color: isListening ? 'var(--muted)' : '#fff', fontWeight: 500, transition: 'all .15s' }}>
                  {isListening ? '✓ Notified!' : `🎧 Listen Together`}
                </button>
              </div>

              {/* Embed player */}
              {isExpanded && embed && (
                <div style={{ marginTop: 10, borderRadius: 10, overflow: 'hidden' }}>
                  <iframe
                    src={embed.embedUrl}
                    width="100%"
                    height={embed.type === 'spotify' ? 80 : 200}
                    frameBorder="0"
                    allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
                    loading="lazy"
                    style={{ display: 'block', borderRadius: 10 }}
                  />
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
