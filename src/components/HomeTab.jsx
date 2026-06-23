import { useState, useEffect, useRef } from 'react'
import { updateShared, sendPing } from '../firebase/firestore'
import { getPartnerToken, sendPushNotification } from '../firebase/fcm'

const MILESTONES = [
  { id: 'first_talk', icon: '💬', name: 'First conversation' },
  { id: 'first_date', icon: '🌹', name: 'First date' },
  { id: 'first_kiss', icon: '💋', name: 'First kiss' },
  { id: 'official',   icon: '💑', name: 'Made it official' },
  { id: 'first_photo',icon: '📸', name: 'First photo together' },
  { id: 'first_fight',icon: '🤝', name: 'First makeup' },
  { id: 'first_trip', icon: '✈️', name: 'First trip together' },
  { id: 'met_family', icon: '👨‍👩‍👧', name: 'Met the family' },
  { id: 'first_gift', icon: '🎁', name: 'First gift' },
  { id: 'first_song', icon: '🎵', name: 'Our first song' },
  { id: 'moved_in',   icon: '🏠', name: 'Moved in together' },
  { id: 'engaged',    icon: '💍', name: 'Got engaged' },
]

const MOODS = [
  { emoji: '😍', label: 'Loved' }, { emoji: '😊', label: 'Happy' },
  { emoji: '😌', label: 'Calm' },  { emoji: '🥺', label: 'Missing' },
  { emoji: '😴', label: 'Tired' },
]

// ─── Cloudinary ───────────────────────────────────────────────────────────────
const CLOUDINARY_CLOUD_NAME = 'dkzipz4kv'
const CLOUDINARY_UPLOAD_PRESET = 'qmnyuxmx'

async function uploadToCloudinary(file) {
  const fd = new FormData()
  fd.append('file', file)
  fd.append('upload_preset', CLOUDINARY_UPLOAD_PRESET)
  const res = await fetch(`https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/image/upload`, {
    method: 'POST', body: fd,
  })
  if (!res.ok) throw new Error('Upload failed')
  return (await res.json()).secure_url
}

// ─── Map ──────────────────────────────────────────────────────────────────────
function WhereWeAreMap() {
  return (
    <svg viewBox="0 0 320 200" xmlns="http://www.w3.org/2000/svg"
      style={{ width: '100%', borderRadius: 8, background: '#0d1f2d' }}>
      <polygon points="60,140 80,100 100,80 130,60 160,55 190,65 220,80 240,100 245,130 230,155 200,168 170,172 140,165 110,160 80,165"
        fill="#1a3a2a" stroke="#2d5a3d" strokeWidth="1" />
      <polygon points="255,70 268,58 278,65 282,85 275,105 262,112 252,100 250,82"
        fill="#1a3a2a" stroke="#2d5a3d" strokeWidth="1" />
      <polygon points="270,45 285,38 295,50 290,68 278,65 268,58"
        fill="#1a3a2a" stroke="#2d5a3d" strokeWidth="1" />
      <path d="M 148,108 C 180,90 230,95 262,88"
        fill="none" stroke="#d4537e" strokeWidth="1.5" strokeDasharray="5,4" opacity="0.8" />
      <text x="205" y="87" textAnchor="middle" fontSize="12" fill="#d4537e">♥</text>
      <circle cx="148" cy="112" r="6" fill="#d4537e" opacity="0.9" />
      <circle cx="148" cy="112" r="3" fill="#fff" />
      <rect x="88" y="118" width="56" height="18" rx="4" fill="#1a0e18" opacity="0.85" />
      <text x="116" y="130" textAnchor="middle" fontSize="8" fill="#f4c0d1" fontWeight="600">Cabadbaran</text>
      <circle cx="262" cy="92" r="6" fill="#d4537e" opacity="0.9" />
      <circle cx="262" cy="92" r="3" fill="#fff" />
      <rect x="220" y="98" width="48" height="18" rx="4" fill="#1a0e18" opacity="0.85" />
      <text x="244" y="110" textAnchor="middle" fontSize="8" fill="#f4c0d1" fontWeight="600">Liloan</text>
      <circle cx="148" cy="98" r="8" fill="#d4537e" />
      <text x="148" y="102" textAnchor="middle" fontSize="8" fill="#fff" fontWeight="700">M</text>
      <circle cx="262" cy="78" r="8" fill="#d4537e" />
      <text x="262" y="82" textAnchor="middle" fontSize="8" fill="#fff" fontWeight="700">N</text>
      <text x="16" y="18" fontSize="9" fill="#d4537e" fontWeight="600" letterSpacing="1">WHERE WE ARE</text>
      <text x="16" y="30" fontSize="8" fill="#4b7a60">Mindanao · Eastern Visayas</text>
    </svg>
  )
}

// ─── Our Song helpers ─────────────────────────────────────────────────────────
function getSongEmbed(url) {
  if (!url) return null
  // YouTube
  const ytMatch = url.match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/|shorts\/))([A-Za-z0-9_-]{11})/)
  if (ytMatch) {
    return { type: 'youtube', embedUrl: `https://www.youtube.com/embed/${ytMatch[1]}?rel=0&modestbranding=1` }
  }
  // Spotify track / playlist / album
  const spMatch = url.match(/spotify\.com\/(track|playlist|album)\/([A-Za-z0-9]+)/)
  if (spMatch) {
    return { type: 'spotify', embedUrl: `https://open.spotify.com/embed/${spMatch[1]}/${spMatch[2]}?utm_source=generator&theme=0` }
  }
  return null
}

// ─── Good morning photo helpers ───────────────────────────────────────────────
function todayDateString() {
  return new Date().toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' })
}

function checkinIcon(type) { return type === 'goodmorning' ? '☀️' : '🌙' }
function toInputDate(label) {
  const d = new Date(label)
  if (isNaN(d)) return ''
  return d.toISOString().split('T')[0]
}

// ─── Main component ───────────────────────────────────────────────────────────
export default function HomeTab({ currentUser, shared, setShared, hasPing }) {
  const [pingState, setPingState] = useState('idle')
  const [modalMs, setModalMs] = useState(null)
  const [msDate, setMsDate] = useState('')
  const [msPhoto, setMsPhoto] = useState(null)
  const [msPhotoUrl, setMsPhotoUrl] = useState('')
  const [msUploading, setMsUploading] = useState(false)
  const [showDatePicker, setShowDatePicker] = useState(false)
  const [annInput, setAnnInput] = useState('')
  const [bgUploading, setBgUploading] = useState(false)

  // Our Song
  const [songInput, setSongInput] = useState('')
  const [showSongInput, setShowSongInput] = useState(false)

  // Good morning photo
  const [gmUploading, setGmUploading] = useState(false)
  const [gmCaption, setGmCaption] = useState('')
  const [showGmForm, setShowGmForm] = useState(false)
  const [gmLightbox, setGmLightbox] = useState(null)

  const bgInputRef = useRef()
  const msPhotoInputRef = useRef()
  const gmPhotoInputRef = useRef()

  const milestones     = shared.milestones      || {}
  const milestonePhotos = shared.milestonePhotos || {}
  const moods          = shared.moods            || { M: null, N: null }
  const annDate        = shared.annDate          || null
  const checkins       = shared.checkins         || {}
  const bgPhoto        = shared.bgPhoto          || null
  const ourSong        = shared.ourSong          || null        // { url, setBy, setAt }
  const gmPhotos       = shared.gmPhotos         || []          // last 3 entries
  const partner        = currentUser === 'M' ? 'N' : 'M'

  useEffect(() => {
    if (hasPing) updateShared({ ping: { ...shared.ping, unread: false } })
  }, [hasPing])

  const doneCount = MILESTONES.filter(ms => milestones[ms.id]).length

  const daysTogetherText = () => {
    if (!annDate) return 'Set date'
    const diff = Math.floor((Date.now() - new Date(annDate)) / 86400000)
    return `${diff} days`
  }

  const nextAnniversaryDays = () => {
    if (!annDate) return null
    const start = new Date(annDate)
    const now   = new Date()
    const next  = new Date(start)
    next.setFullYear(now.getFullYear() + (now > new Date(now.getFullYear(), start.getMonth(), start.getDate()) ? 1 : 0))
    return Math.ceil((next - now) / 86400000)
  }

  // ── Ping ──────────────────────────────────────────────────────────────────
  const handlePing = async () => {
    setPingState('sent')
    await sendPing(currentUser)
    await updateShared({ ping: { from: currentUser, to: partner, unread: true, sentAt: new Date().toISOString() } })
    // FCM push to partner
    const partnerToken = await getPartnerToken(partner)
    await sendPushNotification({
      toToken: partnerToken,
      title: `💗 ${currentUser} is thinking of you!`,
      body: 'Open the app to send a heart back 🥺',
    })
    setTimeout(() => setPingState('idle'), 3000)
  }

  // ── Mood ──────────────────────────────────────────────────────────────────
  const handleMood = async (emoji, label) => {
    const next = { ...moods, [currentUser]: { emoji, label } }
    await updateShared({ moods: next })
  }

  // ── Check-in ──────────────────────────────────────────────────────────────
  const myCheckin      = checkins[currentUser]
  const partnerCheckin = checkins[partner]
  const todayKey       = new Date().toDateString()

  const sendCheckin = async (type) => {
    const next = {
      ...checkins,
      [currentUser]: { type, time: new Date().toLocaleTimeString('en-PH', { hour: '2-digit', minute: '2-digit' }), day: todayKey }
    }
    await updateShared({ checkins: next })
  }

  const clearCheckin = async () => {
    const next = { ...checkins, [currentUser]: null }
    await updateShared({ checkins: next })
  }

  // ── BG photo ──────────────────────────────────────────────────────────────
  const handleBgUpload = async (e) => {
    const file = e.target.files[0]
    if (!file) return
    setBgUploading(true)
    try {
      const url = await uploadToCloudinary(file)
      await updateShared({ bgPhoto: url })
    } catch { alert('Upload failed.') }
    setBgUploading(false)
  }

  // ── Milestone modal ───────────────────────────────────────────────────────
  const openMs = (ms) => {
    setModalMs(ms)
    setMsDate(toInputDate(milestones[ms.id]) || '')
    setMsPhoto(null)
    setMsPhotoUrl(milestonePhotos[ms.id] || '')
  }

  const saveMs = async () => {
    if (!msDate) return
    setMsUploading(true)
    try {
      let photoUrl = msPhotoUrl
      if (msPhoto) photoUrl = await uploadToCloudinary(msPhoto)
      const dateLabel = new Date(msDate).toLocaleDateString('en-PH', { month: 'long', day: 'numeric', year: 'numeric' })
      await updateShared({
        milestones:      { ...milestones,      [modalMs.id]: dateLabel },
        milestonePhotos: { ...milestonePhotos, [modalMs.id]: photoUrl || '' },
      })
      setModalMs(null)
    } catch { alert('Upload failed.') }
    setMsUploading(false)
  }

  const clearMs = async () => {
    const nextMs = { ...milestones }
    const nextPh = { ...milestonePhotos }
    delete nextMs[modalMs.id]
    delete nextPh[modalMs.id]
    await updateShared({ milestones: nextMs, milestonePhotos: nextPh })
    setModalMs(null)
  }

  // ── Anniversary ───────────────────────────────────────────────────────────
  const saveAnn = async () => {
    if (!annInput) return
    await updateShared({ annDate: annInput })
    setShowDatePicker(false)
  }

  // ── Our Song ──────────────────────────────────────────────────────────────
  const saveSong = async () => {
    if (!songInput.trim()) return
    const embed = getSongEmbed(songInput.trim())
    if (!embed) { alert('Paste a YouTube or Spotify link 🎵'); return }
    await updateShared({ ourSong: { url: songInput.trim(), setBy: currentUser, setAt: Date.now() } })
    setSongInput('')
    setShowSongInput(false)
  }

  const clearSong = async () => {
    await updateShared({ ourSong: null })
  }

  // ── Good morning photo ────────────────────────────────────────────────────
  const handleGmUpload = async (e) => {
    const file = e.target.files[0]
    if (!file) return
    setGmUploading(true)
    try {
      const url = await uploadToCloudinary(file)
      const entry = {
        url,
        caption: gmCaption.trim() || '',
        author:  currentUser,
        date:    todayDateString(),
        createdAt: Date.now(),
      }
      // Keep only last 3
      const updated = [entry, ...gmPhotos].slice(0, 3)
      await updateShared({ gmPhotos: updated })
      setGmCaption('')
      setShowGmForm(false)
      gmPhotoInputRef.current.value = ''
    } catch { alert('Upload failed.') }
    setGmUploading(false)
  }

  const songEmbed = ourSong ? getSongEmbed(ourSong.url) : null

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div style={{ flex: 1, overflowY: 'auto' }}>

      {/* Hero cover photo */}
      <div style={{ position: 'relative', height: 200, background: 'var(--card2)', overflow: 'hidden' }}>
        {bgPhoto
          ? <img src={bgPhoto} alt="Cover" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          : <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <span style={{ fontSize: 48 }}>💕</span>
            </div>
        }
        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, rgba(10,5,15,.85) 0%, transparent 60%)' }} />
        <button onClick={() => bgInputRef.current.click()} disabled={bgUploading}
          style={{ position: 'absolute', bottom: 10, right: 10, padding: '5px 10px', background: 'rgba(0,0,0,.5)', border: '0.5px solid rgba(255,255,255,.2)', borderRadius: 6, color: 'rgba(255,255,255,.8)', fontSize: 11, cursor: 'pointer' }}>
          {bgUploading ? 'Uploading...' : '📷 Change cover'}
        </button>
        <input ref={bgInputRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handleBgUpload} />
      </div>

      <div style={{ padding: 16 }}>

        {/* Map */}
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <WhereWeAreMap />
        </div>

        {/* ── Good Morning / Night Photos ──────────────────────────────────── */}
        <div className="card">
          <div className="card-title" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span>🌅 Good Morning / Night</span>
            <button
              onClick={() => setShowGmForm(v => !v)}
              style={{ padding: '4px 10px', background: 'var(--pink)', color: '#fff', border: 'none', borderRadius: 6, fontSize: 11, cursor: 'pointer' }}>
              {showGmForm ? 'Cancel' : '+ Add photo'}
            </button>
          </div>

          {/* Upload form */}
          {showGmForm && (
            <div style={{ marginBottom: 12 }}>
              <input
                ref={gmPhotoInputRef}
                type="file"
                accept="image/*"
                style={{ display: 'none' }}
                onChange={handleGmUpload}
              />
              <input
                value={gmCaption}
                onChange={e => setGmCaption(e.target.value)}
                placeholder={`Good morning / good night message...`}
                style={{ width: '100%', background: 'var(--card2)', border: '0.5px solid var(--border)', borderRadius: 8, color: 'var(--text)', padding: '8px 10px', fontSize: 13, marginBottom: 8 }}
              />
              <button
                onClick={() => gmPhotoInputRef.current.click()}
                disabled={gmUploading}
                style={{ width: '100%', padding: '10px 0', background: 'var(--card2)', border: '1.5px dashed var(--border)', borderRadius: 8, color: gmUploading ? 'var(--muted)' : 'var(--text)', cursor: 'pointer', fontSize: 13 }}>
                {gmUploading ? 'Uploading... ⏳' : '📸 Choose photo & send'}
              </button>
            </div>
          )}

          {/* Last 3 photos */}
          {gmPhotos.length === 0 ? (
            <p style={{ color: 'var(--muted)', fontSize: 13 }}>Send each other a photo to start the day 💕</p>
          ) : (
            <div style={{ display: 'flex', gap: 8, overflowX: 'auto', paddingBottom: 4 }}>
              {gmPhotos.map((photo, i) => (
                <div
                  key={i}
                  onClick={() => setGmLightbox(photo)}
                  style={{ flex: '0 0 110px', borderRadius: 10, overflow: 'hidden', position: 'relative', cursor: 'pointer', border: '0.5px solid var(--border)' }}>
                  <img src={photo.url} alt={photo.caption || 'GM photo'}
                    style={{ width: '100%', height: 120, objectFit: 'cover', display: 'block' }} />
                  <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, rgba(0,0,0,.7) 0%, transparent 50%)' }} />
                  <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, padding: '6px 7px' }}>
                    <div style={{ fontSize: 9, color: 'rgba(255,255,255,.6)', marginBottom: 2 }}>{photo.author} · {photo.date}</div>
                    {photo.caption && (
                      <div style={{ fontSize: 10, color: '#fff', lineHeight: 1.3, overflow: 'hidden', display: '-webkit-box', WebkitBoxOrient: 'vertical', WebkitLineClamp: 2 }}>
                        {photo.caption}
                      </div>
                    )}
                  </div>
                  {i === 0 && (
                    <div style={{ position: 'absolute', top: 6, right: 6, background: 'var(--pink)', borderRadius: 4, padding: '1px 5px', fontSize: 9, color: '#fff', fontWeight: 600 }}>NEW</div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* ── Our Song ──────────────────────────────────────────────────────── */}
        <div className="card">
          <div className="card-title" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span>🎵 Our Song</span>
            {ourSong
              ? <button onClick={clearSong} style={{ background: 'none', border: 'none', color: 'var(--muted)', fontSize: 11, cursor: 'pointer' }}>Change</button>
              : <button onClick={() => setShowSongInput(v => !v)} style={{ padding: '4px 10px', background: 'var(--pink)', color: '#fff', border: 'none', borderRadius: 6, fontSize: 11, cursor: 'pointer' }}>
                  {showSongInput ? 'Cancel' : '+ Set song'}
                </button>
            }
          </div>

          {/* Input form */}
          {showSongInput && !ourSong && (
            <div style={{ marginBottom: 12 }}>
              <input
                value={songInput}
                onChange={e => setSongInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && saveSong()}
                placeholder="Paste a YouTube or Spotify link..."
                style={{ width: '100%', background: 'var(--card2)', border: '0.5px solid var(--border)', borderRadius: 8, color: 'var(--text)', padding: '8px 10px', fontSize: 13, marginBottom: 8 }}
              />
              <button onClick={saveSong}
                style={{ padding: '8px 16px', background: 'var(--pink)', color: '#fff', border: 'none', borderRadius: 8, cursor: 'pointer', fontSize: 13, fontWeight: 500 }}>
                Set as our song 🎵
              </button>
            </div>
          )}

          {/* Embed */}
          {songEmbed ? (
            <div style={{ borderRadius: 10, overflow: 'hidden', marginTop: 4 }}>
              {songEmbed.type === 'youtube' && (
                <iframe
                  src={songEmbed.embedUrl}
                  title="Our Song"
                  width="100%"
                  height="200"
                  frameBorder="0"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                  style={{ display: 'block', borderRadius: 10 }}
                />
              )}
              {songEmbed.type === 'spotify' && (
                <iframe
                  src={songEmbed.embedUrl}
                  title="Our Song"
                  width="100%"
                  height="152"
                  frameBorder="0"
                  allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
                  loading="lazy"
                  style={{ display: 'block', borderRadius: 10 }}
                />
              )}
              {ourSong.setBy && (
                <div style={{ fontSize: 10, color: 'var(--muted)', marginTop: 6 }}>Set by {ourSong.setBy}</div>
              )}
            </div>
          ) : !showSongInput && (
            <p style={{ color: 'var(--muted)', fontSize: 13 }}>No song set yet — pick one that's yours 🎶</p>
          )}
        </div>

        {/* ── Check-in ─────────────────────────────────────────────────────── */}
        <div className="card">
          <div className="card-title">📍 Daily Check-in</div>
          <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
            {['goodmorning', 'goodnight'].map(type => (
              <button key={type} onClick={() => sendCheckin(type)}
                style={{
                  flex: 1, padding: '10px 0',
                  background: myCheckin?.type === type && myCheckin?.day === todayKey ? 'var(--pink)' : 'var(--card2)',
                  border: `0.5px solid ${myCheckin?.type === type && myCheckin?.day === todayKey ? 'var(--pink)' : 'var(--border)'}`,
                  borderRadius: 8, color: myCheckin?.type === type && myCheckin?.day === todayKey ? '#fff' : 'var(--text)',
                  cursor: 'pointer', fontSize: 13, fontWeight: 500,
                }}>
                {checkinIcon(type)} {type === 'goodmorning' ? 'Good morning' : 'Good night'}
              </button>
            ))}
          </div>
          {myCheckin && myCheckin.day === todayKey && (
            <div style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 6 }}>
              You sent {checkinIcon(myCheckin.type)} at {myCheckin.time}
              <button onClick={clearCheckin} style={{ marginLeft: 8, background: 'none', border: 'none', color: 'var(--muted)', cursor: 'pointer', fontSize: 11, textDecoration: 'underline' }}>clear</button>
            </div>
          )}
          {partnerCheckin && partnerCheckin.day === todayKey && (
            <div style={{ fontSize: 13, color: 'var(--pink)' }}>
              {checkinIcon(partnerCheckin.type)} {partner} checked in at {partnerCheckin.time}
            </div>
          )}
        </div>

        {/* ── Ping ─────────────────────────────────────────────────────────── */}
        <div className="card">
          <div className="card-title">💗 Send a little love</div>
          {hasPing && (
            <div style={{ fontSize: 13, color: 'var(--pink)', marginBottom: 8, padding: '8px 10px', background: 'rgba(212,83,126,.1)', borderRadius: 8 }}>
              💗 {partner} is thinking of you right now!
            </div>
          )}
          <button onClick={handlePing}
            style={{
              width: '100%', padding: 16,
              background: pingState === 'sent' ? 'var(--card)' : 'var(--pink)',
              color: pingState === 'sent' ? 'var(--pink)' : '#fff',
              border: pingState === 'sent' ? '0.5px solid var(--pink)' : 'none',
              borderRadius: 12, fontSize: 16, fontWeight: 500, cursor: 'pointer', margin: '8px 0',
            }}>
            {pingState === 'sent' ? `💗 Sent to ${partner}!` : `Send a little heart to ${partner}`}
          </button>
          {pingState === 'sent' && <p style={{ textAlign: 'center', fontSize: 12, color: 'var(--muted)', marginTop: 6 }}>{partner} will feel your love 🥺</p>}
        </div>

        {/* ── Quick mood ────────────────────────────────────────────────────── */}
        <div className="card">
          <div className="card-title">😊 Your mood today</div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {MOODS.map(m => (
              <button key={m.label} onClick={() => handleMood(m.emoji, m.label)}
                style={{
                  flex: 1, minWidth: 50, padding: '8px 4px',
                  background: moods[currentUser]?.label === m.label ? 'var(--pink)' : 'var(--card2)',
                  border: `0.5px solid ${moods[currentUser]?.label === m.label ? 'var(--pink)' : 'var(--border)'}`,
                  borderRadius: 8, color: moods[currentUser]?.label === m.label ? '#fff' : 'var(--text)',
                  cursor: 'pointer', fontSize: 11, textAlign: 'center',
                }}>
                <span style={{ fontSize: 20, display: 'block', marginBottom: 4 }}>{m.emoji}</span>{m.label}
              </button>
            ))}
          </div>
        </div>

        {/* ── Milestones ───────────────────────────────────────────────────── */}
        <div className="card">
          <div className="card-title" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span>🏆 Our milestones</span>
            <span style={{ fontSize: 11, color: 'var(--pink)' }}>{doneCount} / {MILESTONES.length}</span>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
            {MILESTONES.map(ms => {
              const saved = milestones[ms.id]
              const photo = milestonePhotos[ms.id]
              return (
                <div key={ms.id} onClick={() => openMs(ms)}
                  style={{
                    background: saved ? '#1a0e18' : 'var(--card2)',
                    border: `0.5px solid ${saved ? 'var(--pink)' : 'var(--border)'}`,
                    borderRadius: 10, overflow: 'hidden', cursor: 'pointer', position: 'relative',
                  }}>
                  {photo && (
                    <div style={{ position: 'relative', height: 70 }}>
                      <img src={photo} alt={ms.name} style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
                      <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, rgba(0,0,0,.6) 0%, transparent 60%)' }} />
                    </div>
                  )}
                  <div style={{ padding: '10px 12px' }}>
                    {saved && <span style={{ position: 'absolute', top: 7, right: 8, fontSize: 12, color: 'var(--pink)' }}>✓</span>}
                    {!photo && <span style={{ fontSize: 22, marginBottom: 4, display: 'block', opacity: saved ? 1 : 0.4 }}>{ms.icon}</span>}
                    <div style={{ fontSize: 12, fontWeight: 500, lineHeight: 1.3 }}>{ms.name}</div>
                    {saved && <div style={{ fontSize: 10, color: 'var(--pink)', marginTop: 3 }}>{saved}</div>}
                    {!photo && saved && <div style={{ fontSize: 10, color: 'var(--muted)', marginTop: 2 }}>tap to add photo</div>}
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* ── Anniversary ──────────────────────────────────────────────────── */}
        <div className="card">
          <div className="card-title">📅 Anniversary Tracker</div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderBottom: '0.5px solid var(--border)' }}>
            <span>💑 Together since</span>
            <span onClick={() => setShowDatePicker(v => !v)}
              style={{ background: 'var(--pink)', color: '#fff', borderRadius: 6, padding: '2px 8px', fontSize: 11, fontWeight: 600, cursor: 'pointer' }}>
              {daysTogetherText()}
            </span>
          </div>
          {annDate && (
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderBottom: '0.5px solid var(--border)' }}>
              <span>🎉 Next anniversary</span>
              <span style={{ background: 'var(--pink)', color: '#fff', borderRadius: 6, padding: '2px 8px', fontSize: 11, fontWeight: 600 }}>
                {nextAnniversaryDays()} days away
              </span>
            </div>
          )}
          {showDatePicker && (
            <div style={{ marginTop: 10 }}>
              <input type="date" value={annInput} onChange={e => setAnnInput(e.target.value)}
                style={{ background: 'var(--card2)', border: '0.5px solid var(--border)', borderRadius: 6, color: 'var(--text)', padding: 6, width: '100%' }} />
              <button onClick={saveAnn} style={{ marginTop: 6, padding: '10px 20px', background: 'var(--pink)', color: '#fff', border: 'none', borderRadius: 8, cursor: 'pointer', fontSize: 14, fontWeight: 500 }}>Save</button>
            </div>
          )}
        </div>

      </div>{/* /padding wrapper */}

      {/* ── Good morning lightbox ────────────────────────────────────────────── */}
      {gmLightbox && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.92)', zIndex: 200, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 20 }}
          onClick={() => setGmLightbox(null)}>
          <div onClick={e => e.stopPropagation()} style={{ width: '100%', maxWidth: 400 }}>
            <img src={gmLightbox.url} alt={gmLightbox.caption || 'Photo'}
              style={{ width: '100%', borderRadius: 12, maxHeight: '65vh', objectFit: 'contain', display: 'block' }} />
            <div style={{ marginTop: 10, padding: '0 4px' }}>
              {gmLightbox.caption && <p style={{ fontSize: 15, color: '#fff', margin: '0 0 6px', lineHeight: 1.5 }}>{gmLightbox.caption}</p>}
              <p style={{ fontSize: 12, color: 'rgba(255,255,255,.5)', margin: 0 }}>{gmLightbox.author} · {gmLightbox.date}</p>
            </div>
            <button onClick={() => setGmLightbox(null)}
              style={{ marginTop: 14, width: '100%', padding: 12, background: 'rgba(255,255,255,.1)', border: 'none', borderRadius: 8, color: '#fff', cursor: 'pointer', fontSize: 14 }}>
              Close
            </button>
          </div>
        </div>
      )}

      {/* ── Milestone modal ───────────────────────────────────────────────────── */}
      {modalMs && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.7)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
          <div style={{ background: 'var(--card)', border: '0.5px solid var(--pink)', borderRadius: 14, padding: 20, width: '100%', maxWidth: 340 }}>
            <div style={{ fontSize: 16, fontWeight: 600, marginBottom: 4 }}>{modalMs.icon} {modalMs.name}</div>
            <div style={{ fontSize: 13, color: 'var(--muted)', marginBottom: 14 }}>{milestones[modalMs.id] ? `Marked on ${milestones[modalMs.id]}` : 'When did this happen?'}</div>
            <div style={{ marginBottom: 12 }}>
              {msPhotoUrl && !msPhoto && (
                <div style={{ marginBottom: 8, borderRadius: 8, overflow: 'hidden', position: 'relative' }}>
                  <img src={msPhotoUrl} alt="Milestone" style={{ width: '100%', height: 120, objectFit: 'cover', display: 'block' }} />
                  <button onClick={() => setMsPhotoUrl('')}
                    style={{ position: 'absolute', top: 6, right: 6, background: 'rgba(0,0,0,.6)', border: 'none', color: '#fff', borderRadius: 4, padding: '2px 6px', fontSize: 11, cursor: 'pointer' }}>
                    Remove photo
                  </button>
                </div>
              )}
              {msPhoto && (
                <div style={{ marginBottom: 8, borderRadius: 8, overflow: 'hidden' }}>
                  <img src={URL.createObjectURL(msPhoto)} alt="Preview" style={{ width: '100%', height: 120, objectFit: 'cover', display: 'block' }} />
                </div>
              )}
              <input ref={msPhotoInputRef} type="file" accept="image/*" style={{ display: 'none' }}
                onChange={e => { if (e.target.files[0]) setMsPhoto(e.target.files[0]) }} />
              <button onClick={() => msPhotoInputRef.current.click()}
                style={{ padding: '7px 14px', background: 'var(--card2)', border: '0.5px solid var(--border)', borderRadius: 8, color: 'var(--muted)', cursor: 'pointer', fontSize: 12 }}>
                {msPhoto || msPhotoUrl ? '📷 Change photo' : '📷 Add a photo'}
              </button>
            </div>
            <input type="date" value={msDate} onChange={e => setMsDate(e.target.value)}
              style={{ width: '100%', background: 'var(--card2)', border: '0.5px solid var(--border)', borderRadius: 8, color: 'var(--text)', padding: '8px 10px', fontSize: 14, marginBottom: 10 }} />
            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={() => setModalMs(null)}
                style={{ padding: '10px 16px', background: 'none', border: '0.5px solid var(--border)', borderRadius: 8, color: 'var(--muted)', cursor: 'pointer', fontSize: 14 }}>
                Cancel
              </button>
              <button onClick={saveMs} disabled={msUploading}
                style={{ flex: 1, padding: 10, background: msUploading ? 'var(--card2)' : 'var(--pink)', color: msUploading ? 'var(--muted)' : '#fff', border: 'none', borderRadius: 8, cursor: msUploading ? 'default' : 'pointer', fontSize: 14, fontWeight: 500 }}>
                {msUploading ? 'Uploading... ⏳' : 'Mark as done ✓'}
              </button>
            </div>
            {milestones[modalMs.id] && (
              <button onClick={clearMs}
                style={{ marginTop: 8, width: '100%', padding: 8, background: 'none', border: '0.5px solid #a32d2d', borderRadius: 8, color: '#f09595', cursor: 'pointer', fontSize: 12 }}>
                Remove this milestone
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
