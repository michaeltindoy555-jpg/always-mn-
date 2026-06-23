import { useState, useEffect, useRef } from 'react'
import { updateShared, sendPing } from '../firebase/firestore'

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

// Cloudinary upload helper
const CLOUDINARY_CLOUD_NAME = 'dkzipz4kv'
const CLOUDINARY_UPLOAD_PRESET = 'qmnyuxmx'

async function uploadToCloudinary(file) {
  const fd = new FormData()
  fd.append('file', file)
  fd.append('upload_preset', CLOUDINARY_UPLOAD_PRESET)
  const res = await fetch(`https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/image/upload`, {
    method: 'POST',
    body: fd
  })
  if (!res.ok) throw new Error('Upload failed')
  const data = await res.json()
  return data.secure_url
}

// SVG map: Mindanao region with pins for Cabadbaran & Liloan
function WhereWeAreMap() {
  return (
    <svg viewBox="0 0 320 200" xmlns="http://www.w3.org/2000/svg"
      style={{ width: '100%', borderRadius: 8, background: '#0d1f2d' }}>
      <polygon
        points="60,140 80,100 100,80 130,60 160,55 190,65 220,80 240,100 245,130 230,155 200,168 170,172 140,165 110,160 80,165"
        fill="#1a3a2a" stroke="#2d5a3d" strokeWidth="1"
      />
      <polygon
        points="255,70 268,58 278,65 282,85 275,105 262,112 252,100 250,82"
        fill="#1a3a2a" stroke="#2d5a3d" strokeWidth="1"
      />
      <polygon
        points="270,45 285,38 295,50 290,68 278,65 268,58"
        fill="#1a3a2a" stroke="#2d5a3d" strokeWidth="1"
      />
      <path
        d="M 148,108 C 180,90 230,95 262,88"
        fill="none" stroke="#d4537e" strokeWidth="1.5" strokeDasharray="5,4" opacity="0.8"
      />
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

function checkinIcon(type) { return type === 'goodmorning' ? '☀️' : '🌙' }
function checkinLabel(type) { return type === 'goodmorning' ? 'Good morning' : 'Good night' }
function toInputDate(label) {
  const d = new Date(label)
  if (isNaN(d)) return ''
  return d.toISOString().split('T')[0]
}

export default function HomeTab({ currentUser, shared, setShared, hasPing }) {
  const [pingState, setPingState] = useState('idle')
  const [modalMs, setModalMs] = useState(null)
  const [msDate, setMsDate] = useState('')
  const [msPhoto, setMsPhoto] = useState(null)        // preview File
  const [msPhotoUrl, setMsPhotoUrl] = useState('')    // existing saved URL
  const [msUploading, setMsUploading] = useState(false)
  const [showDatePicker, setShowDatePicker] = useState(false)
  const [annInput, setAnnInput] = useState('')
  const [bgUploading, setBgUploading] = useState(false)
  const bgInputRef = useRef()
  const msPhotoInputRef = useRef()

  const milestones = shared.milestones || {}
  const milestonePhotos = shared.milestonePhotos || {}
  const moods = shared.moods || { M: null, N: null }
  const annDate = shared.annDate || null
  const checkins = shared.checkins || {}
  const bgPhoto = shared.bgPhoto || null
  const partner = currentUser === 'M' ? 'N' : 'M'

  useEffect(() => {
    if (hasPing) {
      updateShared({ ping: { ...shared.ping, unread: false } })
    }
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
    const now = new Date()
    const next = new Date(start)
    next.setFullYear(now.getFullYear() + (now > new Date(now.getFullYear(), start.getMonth(), start.getDate()) ? 1 : 0))
    return Math.ceil((next - now) / 86400000)
  }

  const handlePing = async () => {
    setPingState('sent')
    await sendPing(currentUser)
    await updateShared({ ping: { from: currentUser, to: partner, unread: true, sentAt: new Date().toISOString() } })
    setTimeout(() => setPingState('idle'), 3000)
  }

  const handleMood = async (emoji, label) => {
    const next = { ...moods, [currentUser]: { emoji, label } }
    await updateShared({ moods: next })
  }

  const myCheckin = checkins[currentUser]
  const partnerCheckin = checkins[partner]
  const todayKey = new Date().toDateString()

  const sendCheckin = async (type) => {
    const next = {
      ...checkins,
      [currentUser]: { type, time: new Date().toLocaleTimeString('en-PH', { hour: '2-digit', minute: '2-digit' }), day: todayKey }
    }
    await updateShared({ checkins: next })
  }

  const clearCheckin = async () => {
    const next = { ...checkins }
    delete next[currentUser]
    await updateShared({ checkins: next })
  }

  const openMs = (ms) => {
    setModalMs(ms)
    setMsDate(milestones[ms.id] ? toInputDate(milestones[ms.id]) : '')
    setMsPhoto(null)
    setMsPhotoUrl(milestonePhotos[ms.id] || '')
  }

  const saveMs = async () => {
    if (!msDate) { setModalMs(null); return }
    const d = new Date(msDate)
    const label = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
    let photoUrl = msPhotoUrl
    if (msPhoto) {
      setMsUploading(true)
      try {
        photoUrl = await uploadToCloudinary(msPhoto)
      } catch {
        alert('Photo upload failed. Check your Cloudinary settings.')
        setMsUploading(false)
        return
      }
      setMsUploading(false)
    }
    await updateShared({
      milestones: { ...milestones, [modalMs.id]: label },
      milestonePhotos: { ...milestonePhotos, [modalMs.id]: photoUrl || null }
    })
    setModalMs(null)
  }

  const clearMs = async () => {
    const next = { ...milestones }
    const nextPhotos = { ...milestonePhotos }
    delete next[modalMs.id]
    delete nextPhotos[modalMs.id]
    await updateShared({ milestones: next, milestonePhotos: nextPhotos })
    setModalMs(null)
  }

  const saveAnn = async () => {
    if (!annInput) return
    await updateShared({ annDate: annInput })
    setShowDatePicker(false)
  }

  // Background photo upload
  const handleBgUpload = async (e) => {
    const file = e.target.files[0]
    if (!file) return
    setBgUploading(true)
    try {
      const url = await uploadToCloudinary(file)
      await updateShared({ bgPhoto: url })
    } catch {
      alert('Photo upload failed. Check your Cloudinary settings.')
    }
    setBgUploading(false)
  }

  const removeBg = async () => {
    await updateShared({ bgPhoto: null })
  }

  return (
    <div style={{ flex: 1, padding: 16, overflowY: 'auto' }}>
      <div style={{ textAlign: 'center', padding: '20px 0 12px' }}>
        <h2 style={{ fontSize: 22, fontWeight: 600 }}>Hey, {currentUser} 👋</h2>
        <p style={{ color: 'var(--muted)', fontSize: 13, marginTop: 4 }}>You &amp; {partner} — always &amp; forever</p>
      </div>

      {/* Background Photo Card */}
      <div className="card">
        <div className="card-title" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span>🖼️ Our background photo</span>
          {bgPhoto && (
            <button onClick={removeBg} style={{ background: 'none', border: 'none', color: 'var(--muted)', fontSize: 11, cursor: 'pointer' }}>Remove</button>
          )}
        </div>
        {bgPhoto ? (
          <div style={{ position: 'relative', borderRadius: 10, overflow: 'hidden', marginBottom: 8 }}>
            <img src={bgPhoto} alt="Background" style={{ width: '100%', height: 140, objectFit: 'cover', display: 'block' }} />
            <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, rgba(0,0,0,.5) 0%, transparent 60%)', display: 'flex', alignItems: 'flex-end', padding: 10 }}>
              <span style={{ fontSize: 11, color: 'rgba(255,255,255,.7)' }}>This photo is set as your app background 💕</span>
            </div>
          </div>
        ) : (
          <p style={{ fontSize: 13, color: 'var(--muted)', marginBottom: 8 }}>Upload a photo of the two of you as your app's background.</p>
        )}
        <input ref={bgInputRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handleBgUpload} />
        <button
          onClick={() => bgInputRef.current.click()}
          disabled={bgUploading}
          style={{ padding: '10px 20px', background: bgUploading ? 'var(--card2)' : 'var(--pink)', color: bgUploading ? 'var(--muted)' : '#fff', border: 'none', borderRadius: 8, cursor: bgUploading ? 'default' : 'pointer', fontSize: 14, fontWeight: 500 }}>
          {bgUploading ? 'Uploading... ⏳' : bgPhoto ? 'Change photo 📷' : 'Upload our photo 📷'}
        </button>
      </div>

      {/* Where we are map */}
      <div className="card">
        <div className="card-title">🗺️ Where we are</div>
        <WhereWeAreMap />
        <p style={{ fontSize: 11, color: 'var(--muted)', textAlign: 'center', marginTop: 8 }}>
          M in Cabadbaran City · N in Liloan, Southern Leyte
        </p>
      </div>

      {/* Daily check-in */}
      <div className="card">
        <div className="card-title">🌙 Daily check-in</div>
        {myCheckin && myCheckin.day === todayKey ? (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
            <span style={{ fontSize: 14 }}>{checkinIcon(myCheckin.type)} You said "{checkinLabel(myCheckin.type)}" at {myCheckin.time}</span>
            <button onClick={clearCheckin} style={{ background: 'none', border: 'none', color: 'var(--muted)', cursor: 'pointer', fontSize: 12 }}>clear</button>
          </div>
        ) : (
          <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
            <button onClick={() => sendCheckin('goodmorning')}
              style={{ flex: 1, padding: '10px 8px', background: 'var(--card2)', border: '0.5px solid var(--border)', borderRadius: 10, color: 'var(--text)', cursor: 'pointer', fontSize: 13 }}>
              ☀️ Good morning
            </button>
            <button onClick={() => sendCheckin('goodnight')}
              style={{ flex: 1, padding: '10px 8px', background: 'var(--card2)', border: '0.5px solid var(--border)', borderRadius: 10, color: 'var(--text)', cursor: 'pointer', fontSize: 13 }}>
              🌙 Good night
            </button>
          </div>
        )}
        {partnerCheckin && partnerCheckin.day === todayKey ? (
          <div style={{ fontSize: 13, color: 'var(--muted)', background: 'var(--card2)', borderRadius: 8, padding: '8px 10px' }}>
            {checkinIcon(partnerCheckin.type)} <strong style={{ color: 'var(--pink)' }}>{partner}</strong> said "{checkinLabel(partnerCheckin.type)}" at {partnerCheckin.time} 🥺
          </div>
        ) : (
          <div style={{ fontSize: 12, color: 'var(--muted)' }}>Waiting for {partner}'s check-in...</div>
        )}
      </div>

      {/* Ping */}
      <div className="card">
        <div className="card-title">💝 Thinking of You</div>
        {hasPing && (
          <div style={{ fontSize: 13, color: 'var(--pink)', background: '#1a0e18', borderRadius: 8, padding: '8px 10px', marginBottom: 8, textAlign: 'center' }}>
            💗 {partner} is thinking of you right now!
          </div>
        )}
        <button
          onClick={handlePing}
          style={{
            width: '100%', padding: 16, background: pingState === 'sent' ? 'var(--card)' : 'var(--pink)',
            color: pingState === 'sent' ? 'var(--pink)' : '#fff', border: pingState === 'sent' ? '0.5px solid var(--pink)' : 'none',
            borderRadius: 12, fontSize: 16, fontWeight: 500, cursor: 'pointer', margin: '8px 0',
          }}
        >
          {pingState === 'sent' ? `💗 Sent to ${partner}!` : `Send a little heart to ${partner}`}
        </button>
        {pingState === 'sent' && <p style={{ textAlign: 'center', fontSize: 12, color: 'var(--muted)', marginTop: 6 }}>{partner} will feel your love 🥺</p>}
      </div>

      {/* Quick mood */}
      <div className="card">
        <div className="card-title">😊 Your mood today</div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {MOODS.map(m => (
            <button
              key={m.label}
              onClick={() => handleMood(m.emoji, m.label)}
              style={{
                flex: 1, minWidth: 50, padding: '8px 4px', background: moods[currentUser]?.label === m.label ? 'var(--pink)' : 'var(--card2)',
                border: `0.5px solid ${moods[currentUser]?.label === m.label ? 'var(--pink)' : 'var(--border)'}`,
                borderRadius: 8, color: moods[currentUser]?.label === m.label ? '#fff' : 'var(--text)',
                cursor: 'pointer', fontSize: 11, textAlign: 'center',
              }}
            >
              <span style={{ fontSize: 20, display: 'block', marginBottom: 4 }}>{m.emoji}</span>{m.label}
            </button>
          ))}
        </div>
      </div>

      {/* Milestones */}
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
              <div
                key={ms.id}
                onClick={() => openMs(ms)}
                style={{
                  background: saved ? '#1a0e18' : 'var(--card2)',
                  border: `0.5px solid ${saved ? 'var(--pink)' : 'var(--border)'}`,
                  borderRadius: 10, overflow: 'hidden', cursor: 'pointer', position: 'relative',
                }}
              >
                {/* Photo thumbnail if available */}
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

      {/* Anniversary */}
      <div className="card">
        <div className="card-title">📅 Anniversary Tracker</div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderBottom: '0.5px solid var(--border)' }}>
          <span>💑 Together since</span>
          <span
            onClick={() => setShowDatePicker(v => !v)}
            style={{ background: 'var(--pink)', color: '#fff', borderRadius: 6, padding: '2px 8px', fontSize: 11, fontWeight: 600, cursor: 'pointer' }}
          >{daysTogetherText()}</span>
        </div>
        {annDate && (
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderBottom: '0.5px solid var(--border)' }}>
            <span>🎉 Next anniversary</span>
            <span style={{ background: 'var(--pink)', color: '#fff', borderRadius: 6, padding: '2px 8px', fontSize: 11, fontWeight: 600 }}>{nextAnniversaryDays()} days away</span>
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

      {/* Milestone Modal */}
      {modalMs && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.7)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
          <div style={{ background: 'var(--card)', border: '0.5px solid var(--pink)', borderRadius: 14, padding: 20, width: '100%', maxWidth: 340 }}>
            <div style={{ fontSize: 16, fontWeight: 600, marginBottom: 4 }}>{modalMs.icon} {modalMs.name}</div>
            <div style={{ fontSize: 13, color: 'var(--muted)', marginBottom: 14 }}>{milestones[modalMs.id] ? `Marked on ${milestones[modalMs.id]}` : 'When did this happen?'}</div>

            {/* Photo upload for milestone */}
            <div style={{ marginBottom: 12 }}>
              {msPhotoUrl && !msPhoto && (
                <div style={{ marginBottom: 8, borderRadius: 8, overflow: 'hidden', position: 'relative' }}>
                  <img src={msPhotoUrl} alt="Milestone" style={{ width: '100%', height: 120, objectFit: 'cover', display: 'block' }} />
                  <button
                    onClick={() => setMsPhotoUrl('')}
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
              <input
                ref={msPhotoInputRef}
                type="file"
                accept="image/*"
                style={{ display: 'none' }}
                onChange={e => { if (e.target.files[0]) setMsPhoto(e.target.files[0]) }}
              />
              <button
                onClick={() => msPhotoInputRef.current.click()}
                style={{ padding: '7px 14px', background: 'var(--card2)', border: '0.5px solid var(--border)', borderRadius: 8, color: 'var(--muted)', cursor: 'pointer', fontSize: 12 }}>
                {msPhoto || msPhotoUrl ? '📷 Change photo' : '📷 Add a photo'}
              </button>
            </div>

            <input type="date" value={msDate} onChange={e => setMsDate(e.target.value)}
              style={{ width: '100%', background: 'var(--card2)', border: '0.5px solid var(--border)', borderRadius: 8, color: 'var(--text)', padding: '8px 10px', fontSize: 14, marginBottom: 10 }} />
            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={() => setModalMs(null)} style={{ padding: '10px 16px', background: 'none', border: '0.5px solid var(--border)', borderRadius: 8, color: 'var(--muted)', cursor: 'pointer', fontSize: 14 }}>Cancel</button>
              <button onClick={saveMs} disabled={msUploading} style={{ flex: 1, padding: 10, background: msUploading ? 'var(--card2)' : 'var(--pink)', color: msUploading ? 'var(--muted)' : '#fff', border: 'none', borderRadius: 8, cursor: msUploading ? 'default' : 'pointer', fontSize: 14, fontWeight: 500 }}>
                {msUploading ? 'Uploading... ⏳' : 'Mark as done ✓'}
              </button>
            </div>
            {milestones[modalMs.id] && (
              <button onClick={clearMs} style={{ marginTop: 8, width: '100%', padding: 8, background: 'none', border: '0.5px solid #a32d2d', borderRadius: 8, color: '#f09595', cursor: 'pointer', fontSize: 12 }}>Remove this milestone</button>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
