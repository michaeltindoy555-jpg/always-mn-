import { useState, useEffect, useRef } from 'react'
import { updateShared, sendPing } from '../firebase/firestore'
import { getPartnerToken, sendPushNotification } from '../firebase/fcm'

const MILESTONES = [
  { id: 'first_talk',  icon: '💬', name: 'First conversation' },
  { id: 'first_date',  icon: '🌹', name: 'First date' },
  { id: 'first_kiss',  icon: '💋', name: 'First kiss' },
  { id: 'official',    icon: '💑', name: 'Made it official' },
  { id: 'first_photo', icon: '📸', name: 'First photo together' },
  { id: 'first_fight', icon: '🤝', name: 'First makeup' },
  { id: 'first_trip',  icon: '✈️', name: 'First trip together' },
  { id: 'met_family',  icon: '👨‍👩‍👧', name: 'Met the family' },
  { id: 'first_gift',  icon: '🎁', name: 'First gift' },
  { id: 'first_song',  icon: '🎵', name: 'Our first song' },
  { id: 'moved_in',    icon: '🏠', name: 'Moved in together' },
  { id: 'engaged',     icon: '💍', name: 'Got engaged' },
]

const MOODS = [
  { emoji: '😍', label: 'Loved' },
  { emoji: '😊', label: 'Happy' },
  { emoji: '😌', label: 'Calm' },
  { emoji: '🥺', label: 'Missing' },
  { emoji: '😴', label: 'Tired' },
]

const CLOUDINARY_CLOUD_NAME = 'dkzipz4kv'
const CLOUDINARY_UPLOAD_PRESET = 'qmnyuxmx'

async function uploadToCloudinary(file) {
  const fd = new FormData()
  fd.append('file', file)
  fd.append('upload_preset', CLOUDINARY_UPLOAD_PRESET)
  const res = await fetch(`https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/image/upload`, { method: 'POST', body: fd })
  if (!res.ok) throw new Error('Upload failed')
  return (await res.json()).secure_url
}

function getSongEmbed(url) {
  if (!url) return null
  const ytMatch = url.match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/|shorts\/))([A-Za-z0-9_-]{11})/)
  if (ytMatch) return { type: 'youtube', embedUrl: `https://www.youtube.com/embed/${ytMatch[1]}?rel=0&modestbranding=1` }
  const spMatch = url.match(/spotify\.com\/(track|playlist|album)\/([A-Za-z0-9]+)/)
  if (spMatch) return { type: 'spotify', embedUrl: `https://open.spotify.com/embed/${spMatch[1]}/${spMatch[2]}?utm_source=generator&theme=0` }
  return null
}

function todayDateString() {
  return new Date().toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' })
}
function checkinIcon(type) { return type === 'goodmorning' ? '☀️' : '🌙' }
function toInputDate(label) {
  const d = new Date(label)
  if (isNaN(d)) return ''
  return d.toISOString().split('T')[0]
}

// ── Live counter hook ──────────────────────────────────────────────────────────
function useLiveTime() {
  const [now, setNow] = useState(Date.now())
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(id)
  }, [])
  return now
}

function formatDuration(ms) {
  if (ms < 0) return { days: 0, hours: 0, minutes: 0, seconds: 0 }
  const totalSecs = Math.floor(ms / 1000)
  const days    = Math.floor(totalSecs / 86400)
  const hours   = Math.floor((totalSecs % 86400) / 3600)
  const minutes = Math.floor((totalSecs % 3600) / 60)
  const seconds = totalSecs % 60
  return { days, hours, minutes, seconds }
}

// ── Hero section ──────────────────────────────────────────────────────────────
function HeroSection({ annDate, currentUser, partner, moods }) {
  const now = useLiveTime()
  const elapsed = annDate ? now - new Date(annDate).getTime() : null
  const { days, hours, minutes, seconds } = elapsed ? formatDuration(elapsed) : {}

  const myMood = moods[currentUser]
  const partnerMood = moods[partner]

  return (
    <div style={{
      position: 'relative',
      overflow: 'hidden',
      background: 'linear-gradient(135deg, #1a0620 0%, #0d0818 40%, #150d22 100%)',
      padding: '28px 20px 24px',
      borderBottom: '0.5px solid rgba(212,83,126,0.25)',
    }}>
      {/* Ambient orbs */}
      <div style={{
        position: 'absolute', top: -40, left: -40, width: 180, height: 180,
        borderRadius: '50%', background: 'radial-gradient(circle, rgba(212,83,126,0.18) 0%, transparent 70%)',
        pointerEvents: 'none',
      }} />
      <div style={{
        position: 'absolute', bottom: -60, right: -30, width: 220, height: 220,
        borderRadius: '50%', background: 'radial-gradient(circle, rgba(100,60,180,0.15) 0%, transparent 70%)',
        pointerEvents: 'none',
      }} />

      {/* Mood pills row */}
      <div style={{ display: 'flex', justifyContent: 'center', gap: 10, marginBottom: 22, position: 'relative' }}>
        {[currentUser, partner].map((u, i) => {
          const mood = i === 0 ? myMood : partnerMood
          return (
            <div key={u} style={{
              display: 'flex', alignItems: 'center', gap: 5,
              background: 'rgba(255,255,255,0.06)',
              border: '0.5px solid rgba(212,83,126,0.3)',
              borderRadius: 20, padding: '4px 12px',
              fontSize: 12,
            }}>
              <span style={{ fontSize: 15 }}>{mood?.emoji || '•'}</span>
              <span style={{ color: 'rgba(244,192,209,0.8)', fontWeight: 500 }}>{u}</span>
              {mood && <span style={{ color: 'rgba(180,140,160,0.7)', fontSize: 10 }}>{mood.label}</span>}
            </div>
          )
        })}
      </div>

      {/* Counter */}
      {elapsed !== null ? (
        <div style={{ textAlign: 'center', position: 'relative' }}>
          <div style={{ fontSize: 11, letterSpacing: 3, color: 'rgba(212,83,126,0.8)', textTransform: 'uppercase', marginBottom: 14, fontWeight: 500 }}>
            Together for
          </div>
          <div style={{ display: 'flex', justifyContent: 'center', gap: 10, marginBottom: 8 }}>
            {[['days', days], ['hrs', hours], ['min', minutes], ['sec', seconds]].map(([label, val]) => (
              <div key={label} style={{ textAlign: 'center', minWidth: 52 }}>
                <div style={{
                  fontSize: label === 'days' ? 36 : 26,
                  fontWeight: 700,
                  color: '#fff',
                  lineHeight: 1,
                  fontVariantNumeric: 'tabular-nums',
                  letterSpacing: label === 'sec' ? '-1px' : '0px',
                  textShadow: '0 0 20px rgba(212,83,126,0.5)',
                }}>
                  {String(val).padStart(2, '0')}
                </div>
                <div style={{ fontSize: 9, color: 'rgba(212,83,126,0.6)', textTransform: 'uppercase', letterSpacing: 1.5, marginTop: 4 }}>
                  {label}
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div style={{ textAlign: 'center', color: 'rgba(212,83,126,0.5)', fontSize: 13, padding: '10px 0' }}>
          Set your anniversary date to start the counter ✨
        </div>
      )}

      {/* M ♥ N line */}
      <div style={{ textAlign: 'center', marginTop: 14, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10 }}>
        <div style={{ flex: 1, height: '0.5px', background: 'linear-gradient(to right, transparent, rgba(212,83,126,0.3))' }} />
        <span style={{ fontSize: 11, color: 'rgba(212,83,126,0.7)', letterSpacing: 4, fontWeight: 500 }}>M ♥ N</span>
        <div style={{ flex: 1, height: '0.5px', background: 'linear-gradient(to left, transparent, rgba(212,83,126,0.3))' }} />
      </div>
    </div>
  )
}

// ── Main component ────────────────────────────────────────────────────────────
export default function HomeTab({ currentUser, shared, hasPing }) {
  const [pingState, setPingState]         = useState('idle')
  const [modalMs, setModalMs]             = useState(null)
  const [msDate, setMsDate]               = useState('')
  const [msPhoto, setMsPhoto]             = useState(null)
  const [msPhotoUrl, setMsPhotoUrl]       = useState('')
  const [msUploading, setMsUploading]     = useState(false)
  const [showDatePicker, setShowDatePicker] = useState(false)
  const [annInput, setAnnInput]           = useState('')
  const [songInput, setSongInput]         = useState('')
  const [showSongInput, setShowSongInput] = useState(false)
  const [showAddCustomMs, setShowAddCustomMs] = useState(false)
  const [customMsName, setCustomMsName]   = useState('')
  const [customMsEmoji, setCustomMsEmoji] = useState('⭐')
  const [savingCustomMs, setSavingCustomMs] = useState(false)
  const [gmUploading, setGmUploading]     = useState(false)
  const [gmCaption, setGmCaption]         = useState('')
  const [showGmForm, setShowGmForm]       = useState(false)
  const [gmLightbox, setGmLightbox]       = useState(null)

  const msPhotoInputRef = useRef()
  const gmPhotoInputRef = useRef()

  const milestones      = shared.milestones      || {}
  const milestonePhotos = shared.milestonePhotos || {}
  const customMilestones = shared.customMilestones || []  // array of {id, icon, name}
  const moods           = shared.moods            || { M: null, N: null }
  const annDate         = shared.annDate          || null
  const checkins        = shared.checkins         || {}
  const ourSong         = shared.ourSong          || null
  const gmPhotos        = shared.gmPhotos         || []
  const partner         = currentUser === 'M' ? 'N' : 'M'
  const todayKey        = new Date().toDateString()

  useEffect(() => {
    if (hasPing) updateShared({ ping: { ...shared.ping, unread: false } })
  }, [hasPing])

  const allMilestones = [...MILESTONES, ...customMilestones]
  const doneCount = allMilestones.filter(ms => milestones[ms.id]).length

  const nextAnniversaryDays = () => {
    if (!annDate) return null
    const start = new Date(annDate)
    const now   = new Date()
    const next  = new Date(start)
    next.setFullYear(now.getFullYear() + (now > new Date(now.getFullYear(), start.getMonth(), start.getDate()) ? 1 : 0))
    return Math.ceil((next - now) / 86400000)
  }

  const nextMonthsaryInfo = () => {
    if (!annDate) return null
    const start = new Date(annDate)
    const now   = new Date()
    const annDay = start.getDate()
    // Find next occurrence of the same day-of-month
    let candidate = new Date(now.getFullYear(), now.getMonth(), annDay)
    // If that day already passed this month (or is today and time has passed), go to next month
    if (candidate <= now) {
      candidate = new Date(now.getFullYear(), now.getMonth() + 1, annDay)
    }
    const daysUntil = Math.ceil((candidate - now) / 86400000)
    const monthsCount = (candidate.getFullYear() - start.getFullYear()) * 12 + (candidate.getMonth() - start.getMonth())
    return { daysUntil, monthsCount, date: candidate }
  }

  const handlePing = async () => {
    setPingState('sent')
    await sendPing(currentUser)
    await updateShared({ ping: { from: currentUser, to: partner, unread: true, sentAt: new Date().toISOString() } })
    const partnerToken = await getPartnerToken(partner)
    await sendPushNotification({
      toToken: partnerToken,
      title: `💗 ${currentUser} is thinking of you!`,
      body: 'Open the app to send a heart back 🥺',
    })
    setTimeout(() => setPingState('idle'), 3000)
  }

  const handleMood = async (emoji, label) => {
    const next = { ...moods, [currentUser]: { emoji, label } }
    await updateShared({ moods: next })
  }

  const myCheckin      = checkins[currentUser]
  const partnerCheckin = checkins[partner]

  const sendCheckin = async (type) => {
    const next = {
      ...checkins,
      [currentUser]: { type, time: new Date().toLocaleTimeString('en-PH', { hour: '2-digit', minute: '2-digit' }), day: todayKey }
    }
    await updateShared({ checkins: next })
  }

  const clearCheckin = async () => {
    await updateShared({ checkins: { ...checkins, [currentUser]: null } })
  }

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
    delete nextMs[modalMs.id]; delete nextPh[modalMs.id]
    await updateShared({ milestones: nextMs, milestonePhotos: nextPh })
    setModalMs(null)
  }

  const saveCustomMs = async () => {
    if (!customMsName.trim()) return
    setSavingCustomMs(true)
    const id = 'custom_' + Date.now()
    const newMs = { id, icon: customMsEmoji, name: customMsName.trim() }
    await updateShared({ customMilestones: [...customMilestones, newMs] })
    setCustomMsName('')
    setCustomMsEmoji('⭐')
    setShowAddCustomMs(false)
    setSavingCustomMs(false)
  }

  const deleteCustomMs = async (id) => {
    const next = customMilestones.filter(m => m.id !== id)
    const nextMs = { ...milestones }
    const nextPh = { ...milestonePhotos }
    delete nextMs[id]; delete nextPh[id]
    await updateShared({ customMilestones: next, milestones: nextMs, milestonePhotos: nextPh })
    setModalMs(null)
  }

  const saveAnn = async () => {
    if (!annInput) return
    await updateShared({ annDate: annInput })
    setShowDatePicker(false)
  }

  const saveSong = async () => {
    if (!songInput.trim()) return
    const embed = getSongEmbed(songInput.trim())
    if (!embed) { alert('Paste a YouTube or Spotify link 🎵'); return }
    await updateShared({ ourSong: { url: songInput.trim(), setBy: currentUser, setAt: Date.now() } })
    setSongInput(''); setShowSongInput(false)
  }

  const clearSong = async () => { await updateShared({ ourSong: null }) }

  const handleGmUpload = async (e) => {
    const file = e.target.files[0]
    if (!file) return
    setGmUploading(true)
    try {
      const url = await uploadToCloudinary(file)
      const entry = { url, caption: gmCaption.trim() || '', author: currentUser, date: todayDateString(), createdAt: Date.now() }
      const updated = [entry, ...gmPhotos].slice(0, 3)
      await updateShared({ gmPhotos: updated })
      setGmCaption(''); setShowGmForm(false)
      gmPhotoInputRef.current.value = ''
    } catch { alert('Upload failed.') }
    setGmUploading(false)
  }

  const songEmbed = ourSong ? getSongEmbed(ourSong.url) : null

  return (
    <div style={{ flex: 1, overflowY: 'auto', background: 'var(--bg)' }}>

      <HeroSection annDate={annDate} currentUser={currentUser} partner={partner} moods={moods} />

      <div style={{ padding: '14px 14px 24px' }}>

        {/* ── Ping card ─────────────────────────────────────────────────────── */}
        <div style={{
          background: 'linear-gradient(135deg, rgba(212,83,126,0.12) 0%, rgba(100,60,180,0.08) 100%)',
          border: '0.5px solid rgba(212,83,126,0.35)',
          borderRadius: 16, padding: '16px 16px', marginBottom: 12,
        }}>
          {hasPing && (
            <div style={{
              fontSize: 13, color: '#f4c0d1', marginBottom: 10,
              padding: '8px 12px', background: 'rgba(212,83,126,0.15)',
              borderRadius: 10, textAlign: 'center', letterSpacing: 0.3,
            }}>
              💗 {partner} is thinking of you right now!
            </div>
          )}
          <button onClick={handlePing} style={{
            width: '100%', padding: '14px 0',
            background: pingState === 'sent'
              ? 'transparent'
              : 'linear-gradient(135deg, #d4537e 0%, #a03060 100%)',
            color: pingState === 'sent' ? 'var(--pink)' : '#fff',
            border: pingState === 'sent' ? '0.5px solid var(--pink)' : 'none',
            borderRadius: 12, fontSize: 15, fontWeight: 600, cursor: 'pointer',
            letterSpacing: 0.3,
            boxShadow: pingState !== 'sent' ? '0 4px 20px rgba(212,83,126,0.35)' : 'none',
            transition: 'all .25s',
          }}>
            {pingState === 'sent' ? `💗 Sent to ${partner}!` : `Send a little heart to ${partner} 💗`}
          </button>
          {pingState === 'sent' && <p style={{ textAlign: 'center', fontSize: 11, color: 'rgba(244,192,209,0.6)', marginTop: 6 }}>{partner} will feel your love 🥺</p>}
        </div>

        {/* ── Quick mood ────────────────────────────────────────────────────── */}
        <div className="card">
          <div className="card-title">😊 How you feel right now</div>
          <div style={{ display: 'flex', gap: 6 }}>
            {MOODS.map(m => (
              <button key={m.label} onClick={() => handleMood(m.emoji, m.label)}
                style={{
                  flex: 1, padding: '10px 4px',
                  background: moods[currentUser]?.label === m.label
                    ? 'linear-gradient(135deg, rgba(212,83,126,0.3) 0%, rgba(160,48,96,0.3) 100%)'
                    : 'var(--card2)',
                  border: `0.5px solid ${moods[currentUser]?.label === m.label ? 'rgba(212,83,126,0.7)' : 'var(--border)'}`,
                  borderRadius: 10, color: 'var(--text)',
                  cursor: 'pointer', fontSize: 10, textAlign: 'center',
                  transition: 'all .2s',
                  boxShadow: moods[currentUser]?.label === m.label ? '0 2px 10px rgba(212,83,126,0.2)' : 'none',
                }}>
                <span style={{ fontSize: 22, display: 'block', marginBottom: 4 }}>{m.emoji}</span>
                {m.label}
              </button>
            ))}
          </div>
        </div>

        {/* ── Check-in ──────────────────────────────────────────────────────── */}
        <div className="card">
          <div className="card-title">📍 Daily Check-in</div>
          <div style={{ display: 'flex', gap: 8, marginBottom: 10 }}>
            {['goodmorning', 'goodnight'].map(type => {
              const active = myCheckin?.type === type && myCheckin?.day === todayKey
              return (
                <button key={type} onClick={() => sendCheckin(type)} style={{
                  flex: 1, padding: '11px 0',
                  background: active
                    ? 'linear-gradient(135deg, rgba(212,83,126,0.25), rgba(160,48,96,0.25))'
                    : 'var(--card2)',
                  border: `0.5px solid ${active ? 'rgba(212,83,126,0.6)' : 'var(--border)'}`,
                  borderRadius: 10, color: active ? '#f4c0d1' : 'var(--text)',
                  cursor: 'pointer', fontSize: 13, fontWeight: active ? 600 : 400,
                  transition: 'all .2s',
                }}>
                  {checkinIcon(type)} {type === 'goodmorning' ? 'Good morning' : 'Good night'}
                </button>
              )
            })}
          </div>
          {myCheckin && myCheckin.day === todayKey && (
            <div style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 4 }}>
              You sent {checkinIcon(myCheckin.type)} at {myCheckin.time}
              <button onClick={clearCheckin} style={{ marginLeft: 8, background: 'none', border: 'none', color: 'var(--muted)', cursor: 'pointer', fontSize: 11, textDecoration: 'underline' }}>clear</button>
            </div>
          )}
          {partnerCheckin && partnerCheckin.day === todayKey && (
            <div style={{ fontSize: 13, color: '#f4c0d1' }}>
              {checkinIcon(partnerCheckin.type)} {partner} checked in at {partnerCheckin.time}
            </div>
          )}
        </div>

        {/* ── Good morning photos ────────────────────────────────────────────── */}
        <div className="card">
          <div className="card-title" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span>🌅 Good Morning / Night</span>
            <button onClick={() => setShowGmForm(v => !v)}
              style={{ padding: '4px 10px', background: showGmForm ? 'var(--card2)' : 'var(--pink)', color: showGmForm ? 'var(--muted)' : '#fff', border: showGmForm ? '0.5px solid var(--border)' : 'none', borderRadius: 6, fontSize: 11, cursor: 'pointer' }}>
              {showGmForm ? 'Cancel' : '+ Photo'}
            </button>
          </div>
          {showGmForm && (
            <div style={{ marginBottom: 12 }}>
              <input ref={gmPhotoInputRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handleGmUpload} />
              <input value={gmCaption} onChange={e => setGmCaption(e.target.value)}
                placeholder="Good morning / good night message..."
                style={{ width: '100%', background: 'var(--card2)', border: '0.5px solid var(--border)', borderRadius: 8, color: 'var(--text)', padding: '8px 10px', fontSize: 13, marginBottom: 8 }} />
              <button onClick={() => gmPhotoInputRef.current.click()} disabled={gmUploading}
                style={{ width: '100%', padding: '10px 0', background: 'var(--card2)', border: '1.5px dashed var(--border)', borderRadius: 8, color: gmUploading ? 'var(--muted)' : 'var(--text)', cursor: 'pointer', fontSize: 13 }}>
                {gmUploading ? 'Uploading... ⏳' : '📸 Choose photo & send'}
              </button>
            </div>
          )}
          {gmPhotos.length === 0
            ? <p style={{ color: 'var(--muted)', fontSize: 13 }}>Send each other a photo to start the day 💕</p>
            : (
              <div style={{ display: 'flex', gap: 8, overflowX: 'auto', paddingBottom: 4 }}>
                {gmPhotos.map((photo, i) => (
                  <div key={i} onClick={() => setGmLightbox(photo)}
                    style={{ flex: '0 0 110px', borderRadius: 12, overflow: 'hidden', position: 'relative', cursor: 'pointer', border: '0.5px solid var(--border)' }}>
                    <img src={photo.url} alt={photo.caption || 'GM photo'} style={{ width: '100%', height: 120, objectFit: 'cover', display: 'block' }} />
                    <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, rgba(0,0,0,.7) 0%, transparent 50%)' }} />
                    <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, padding: '6px 7px' }}>
                      <div style={{ fontSize: 9, color: 'rgba(255,255,255,.6)', marginBottom: 1 }}>{photo.author} · {photo.date}</div>
                      {photo.caption && <div style={{ fontSize: 10, color: '#fff', lineHeight: 1.3, overflow: 'hidden', display: '-webkit-box', WebkitBoxOrient: 'vertical', WebkitLineClamp: 2 }}>{photo.caption}</div>}
                    </div>
                    {i === 0 && <div style={{ position: 'absolute', top: 6, right: 6, background: 'var(--pink)', borderRadius: 4, padding: '1px 5px', fontSize: 9, color: '#fff', fontWeight: 600 }}>NEW</div>}
                  </div>
                ))}
              </div>
            )
          }
        </div>

        {/* ── Anniversary tracker ────────────────────────────────────────────── */}
        <div className="card">
          <div className="card-title">📅 Anniversary</div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '6px 0', borderBottom: '0.5px solid var(--border)' }}>
            <span style={{ fontSize: 13, color: 'var(--text)' }}>💑 Together since</span>
            <span onClick={() => setShowDatePicker(v => !v)}
              style={{ background: 'var(--pink)', color: '#fff', borderRadius: 8, padding: '3px 10px', fontSize: 11, fontWeight: 600, cursor: 'pointer' }}>
              {annDate ? new Date(annDate).toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' }) : 'Set date'}
            </span>
          </div>
          {annDate && (() => {
            const msInfo = nextMonthsaryInfo()
            return (
              <>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '6px 0', borderBottom: '0.5px solid var(--border)' }}>
                  <span style={{ fontSize: 13, color: 'var(--text)' }}>🎉 Next anniversary</span>
                  <span style={{ background: 'rgba(212,83,126,0.15)', color: 'var(--pink)', borderRadius: 8, padding: '3px 10px', fontSize: 11, fontWeight: 600, border: '0.5px solid rgba(212,83,126,0.3)' }}>
                    {nextAnniversaryDays()} days away
                  </span>
                </div>
                {msInfo && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '6px 0' }}>
                    <div>
                      <span style={{ fontSize: 13, color: 'var(--text)' }}>🗓️ Next monthsary</span>
                      <div style={{ fontSize: 10, color: 'var(--muted)', marginTop: 1 }}>
                        {msInfo.monthsCount} month{msInfo.monthsCount !== 1 ? 's' : ''} · {msInfo.date.toLocaleDateString('en-PH', { month: 'short', day: 'numeric' })}
                      </div>
                    </div>
                    <span style={{ background: 'rgba(212,83,126,0.1)', color: 'var(--pink)', borderRadius: 8, padding: '3px 10px', fontSize: 11, fontWeight: 600, border: '0.5px solid rgba(212,83,126,0.2)' }}>
                      {msInfo.daysUntil === 0 ? 'Today! 🎉' : `${msInfo.daysUntil} day${msInfo.daysUntil !== 1 ? 's' : ''} away`}
                    </span>
                  </div>
                )}
              </>
            )
          })()}
          {showDatePicker && (
            <div style={{ marginTop: 10 }}>
              <input type="date" value={annInput} onChange={e => setAnnInput(e.target.value)}
                style={{ background: 'var(--card2)', border: '0.5px solid var(--border)', borderRadius: 6, color: 'var(--text)', padding: 6, width: '100%', marginBottom: 6 }} />
              <button onClick={saveAnn} style={{ padding: '10px 20px', background: 'var(--pink)', color: '#fff', border: 'none', borderRadius: 8, cursor: 'pointer', fontSize: 14, fontWeight: 500 }}>Save</button>
            </div>
          )}
        </div>

        {/* ── Our Song ──────────────────────────────────────────────────────── */}
        <div className="card">
          <div className="card-title" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span>🎵 Our Song</span>
            {ourSong
              ? <button onClick={clearSong} style={{ background: 'none', border: 'none', color: 'var(--muted)', fontSize: 11, cursor: 'pointer' }}>Change</button>
              : <button onClick={() => setShowSongInput(v => !v)} style={{ padding: '4px 10px', background: showSongInput ? 'var(--card2)' : 'var(--pink)', color: showSongInput ? 'var(--muted)' : '#fff', border: showSongInput ? '0.5px solid var(--border)' : 'none', borderRadius: 6, fontSize: 11, cursor: 'pointer' }}>
                  {showSongInput ? 'Cancel' : '+ Set song'}
                </button>
            }
          </div>
          {showSongInput && !ourSong && (
            <div style={{ marginBottom: 12 }}>
              <input value={songInput} onChange={e => setSongInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && saveSong()}
                placeholder="Paste a YouTube or Spotify link..."
                style={{ width: '100%', background: 'var(--card2)', border: '0.5px solid var(--border)', borderRadius: 8, color: 'var(--text)', padding: '8px 10px', fontSize: 13, marginBottom: 8 }} />
              <button onClick={saveSong} style={{ padding: '8px 16px', background: 'var(--pink)', color: '#fff', border: 'none', borderRadius: 8, cursor: 'pointer', fontSize: 13, fontWeight: 500 }}>
                Set as our song 🎵
              </button>
            </div>
          )}
          {songEmbed ? (
            <div style={{ borderRadius: 12, overflow: 'hidden', marginTop: 4 }}>
              {songEmbed.type === 'youtube' && (
                <iframe src={songEmbed.embedUrl} title="Our Song" width="100%" height="200" frameBorder="0"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowFullScreen style={{ display: 'block', borderRadius: 12 }} />
              )}
              {songEmbed.type === 'spotify' && (
                <iframe src={songEmbed.embedUrl} title="Our Song" width="100%" height="152" frameBorder="0"
                  allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture" loading="lazy" style={{ display: 'block', borderRadius: 12 }} />
              )}
              {ourSong.setBy && <div style={{ fontSize: 10, color: 'var(--muted)', marginTop: 6 }}>Set by {ourSong.setBy}</div>}
            </div>
          ) : !showSongInput && (
            <p style={{ color: 'var(--muted)', fontSize: 13 }}>No song set yet — pick one that's yours 🎶</p>
          )}
        </div>

        {/* ── Milestones ────────────────────────────────────────────────────── */}
        <div className="card">
          <div className="card-title" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span>🏆 Our milestones</span>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: 11, color: 'var(--pink)', background: 'rgba(212,83,126,0.12)', padding: '2px 8px', borderRadius: 10, border: '0.5px solid rgba(212,83,126,0.3)' }}>
                {doneCount} / {allMilestones.length}
              </span>
              <button onClick={() => setShowAddCustomMs(v => !v)}
                style={{ padding: '3px 9px', background: showAddCustomMs ? 'var(--card2)' : 'var(--pink)', color: showAddCustomMs ? 'var(--muted)' : '#fff', border: showAddCustomMs ? '0.5px solid var(--border)' : 'none', borderRadius: 8, fontSize: 11, cursor: 'pointer', fontWeight: 500 }}>
                {showAddCustomMs ? 'Cancel' : '+ Add'}
              </button>
            </div>
          </div>

          {/* Add custom milestone form */}
          {showAddCustomMs && (
            <div style={{ background: 'var(--card2)', border: '0.5px solid rgba(212,83,126,0.2)', borderRadius: 12, padding: 12, marginBottom: 12 }}>
              <div style={{ fontSize: 11, color: 'var(--muted)', marginBottom: 8, textTransform: 'uppercase', letterSpacing: 1 }}>New milestone</div>
              <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
                <input
                  value={customMsEmoji}
                  onChange={e => setCustomMsEmoji(e.target.value)}
                  placeholder="🎉"
                  style={{ width: 48, background: 'var(--card)', border: '0.5px solid var(--border)', borderRadius: 8, color: 'var(--text)', padding: '8px', fontSize: 20, textAlign: 'center' }}
                />
                <input
                  value={customMsName}
                  onChange={e => setCustomMsName(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && saveCustomMs()}
                  placeholder="e.g. First video call..."
                  style={{ flex: 1, background: 'var(--card)', border: '0.5px solid var(--border)', borderRadius: 8, color: 'var(--text)', padding: '8px 10px', fontSize: 13 }}
                />
              </div>
              <button onClick={saveCustomMs} disabled={savingCustomMs || !customMsName.trim()}
                style={{ width: '100%', padding: '9px 0', background: customMsName.trim() ? 'var(--pink)' : 'var(--card)', color: customMsName.trim() ? '#fff' : 'var(--muted)', border: 'none', borderRadius: 8, cursor: customMsName.trim() ? 'pointer' : 'default', fontSize: 13, fontWeight: 500 }}>
                {savingCustomMs ? 'Saving...' : 'Add milestone ✓'}
              </button>
            </div>
          )}

          {/* Progress bar */}
          <div style={{ height: 4, background: 'var(--card2)', borderRadius: 4, marginBottom: 14, overflow: 'hidden' }}>
            <div style={{ height: '100%', background: 'linear-gradient(90deg, #d4537e, #a03060)', borderRadius: 4, width: `${allMilestones.length ? doneCount / allMilestones.length * 100 : 0}%`, transition: 'width .4s' }} />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
            {allMilestones.map(ms => {
              const saved = milestones[ms.id]
              const photo = milestonePhotos[ms.id]
              return (
                <div key={ms.id} onClick={() => openMs(ms)}
                  style={{
                    background: saved ? 'linear-gradient(135deg, rgba(212,83,126,0.1), rgba(100,48,96,0.08))' : 'var(--card2)',
                    border: `0.5px solid ${saved ? 'rgba(212,83,126,0.45)' : 'var(--border)'}`,
                    borderRadius: 12, overflow: 'hidden', cursor: 'pointer', position: 'relative',
                    transition: 'all .2s',
                  }}>
                  {photo && (
                    <div style={{ position: 'relative', height: 70 }}>
                      <img src={photo} alt={ms.name} style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
                      <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, rgba(0,0,0,.65) 0%, transparent 60%)' }} />
                    </div>
                  )}
                  <div style={{ padding: '10px 12px' }}>
                    {saved && <span style={{ position: 'absolute', top: 8, right: 9, fontSize: 11, color: 'var(--pink)', fontWeight: 700 }}>✓</span>}
                    {!photo && <span style={{ fontSize: 22, marginBottom: 4, display: 'block', opacity: saved ? 1 : 0.35 }}>{ms.icon}</span>}
                    <div style={{ fontSize: 12, fontWeight: 500, lineHeight: 1.3 }}>{ms.name}</div>
                    {saved && <div style={{ fontSize: 10, color: 'var(--pink)', marginTop: 3 }}>{saved}</div>}
                    {!photo && saved && <div style={{ fontSize: 10, color: 'rgba(180,140,160,0.5)', marginTop: 2 }}>tap to add photo</div>}
                  </div>
                </div>
              )
            })}
          </div>
        </div>

      </div>

      {/* ── Good morning lightbox ─────────────────────────────────────────────── */}
      {gmLightbox && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.92)', zIndex: 200, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 20 }}
          onClick={() => setGmLightbox(null)}>
          <div onClick={e => e.stopPropagation()} style={{ width: '100%', maxWidth: 400 }}>
            <img src={gmLightbox.url} alt={gmLightbox.caption || 'Photo'} style={{ width: '100%', borderRadius: 12, maxHeight: '65vh', objectFit: 'contain', display: 'block' }} />
            <div style={{ marginTop: 10, padding: '0 4px' }}>
              {gmLightbox.caption && <p style={{ fontSize: 15, color: '#fff', margin: '0 0 6px', lineHeight: 1.5 }}>{gmLightbox.caption}</p>}
              <p style={{ fontSize: 12, color: 'rgba(255,255,255,.5)', margin: 0 }}>{gmLightbox.author} · {gmLightbox.date}</p>
            </div>
            <button onClick={() => setGmLightbox(null)} style={{ marginTop: 14, width: '100%', padding: 12, background: 'rgba(255,255,255,.1)', border: 'none', borderRadius: 8, color: '#fff', cursor: 'pointer', fontSize: 14 }}>Close</button>
          </div>
        </div>
      )}

      {/* ── Milestone modal ───────────────────────────────────────────────────── */}
      {modalMs && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.75)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
          <div style={{ background: 'var(--card)', border: '0.5px solid rgba(212,83,126,0.5)', borderRadius: 16, padding: 20, width: '100%', maxWidth: 340 }}>
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
                style={{ padding: '10px 16px', background: 'none', border: '0.5px solid var(--border)', borderRadius: 8, color: 'var(--muted)', cursor: 'pointer', fontSize: 14 }}>Cancel</button>
              <button onClick={saveMs} disabled={msUploading}
                style={{ flex: 1, padding: 10, background: msUploading ? 'var(--card2)' : 'var(--pink)', color: msUploading ? 'var(--muted)' : '#fff', border: 'none', borderRadius: 8, cursor: msUploading ? 'default' : 'pointer', fontSize: 14, fontWeight: 500 }}>
                {msUploading ? 'Uploading... ⏳' : 'Mark as done ✓'}
              </button>
            </div>
            {milestones[modalMs?.id] && (
              <button onClick={clearMs}
                style={{ marginTop: 8, width: '100%', padding: 8, background: 'none', border: '0.5px solid #a32d2d', borderRadius: 8, color: '#f09595', cursor: 'pointer', fontSize: 12 }}>
                Remove this milestone
              </button>
            )}
            {modalMs?.id?.startsWith('custom_') && (
              <button onClick={() => deleteCustomMs(modalMs.id)}
                style={{ marginTop: 6, width: '100%', padding: 8, background: 'none', border: '0.5px solid #a32d2d', borderRadius: 8, color: '#f09595', cursor: 'pointer', fontSize: 12 }}>
                🗑 Delete this custom milestone
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
