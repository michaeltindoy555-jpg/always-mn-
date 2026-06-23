import { useState, useEffect } from 'react'
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

export default function HomeTab({ currentUser, shared, setShared }) {
  const [pingState, setPingState] = useState('idle') // idle | sent
  const [modalMs, setModalMs] = useState(null)
  const [msDate, setMsDate] = useState('')
  const [showDatePicker, setShowDatePicker] = useState(false)
  const [annInput, setAnnInput] = useState('')

  const milestones = shared.milestones || {}
  const moods = shared.moods || { M: null, N: null }
  const annDate = shared.annDate || null

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
    setTimeout(() => setPingState('idle'), 3000)
  }

  const handleMood = async (emoji, label) => {
    const next = { ...moods, [currentUser]: { emoji, label } }
    await updateShared({ moods: next })
  }

  const openMs = (ms) => {
    setModalMs(ms)
    setMsDate(milestones[ms.id] ? toInputDate(milestones[ms.id]) : '')
  }

  const saveMs = async () => {
    if (!msDate) { setModalMs(null); return }
    const d = new Date(msDate)
    const label = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
    await updateShared({ milestones: { ...milestones, [modalMs.id]: label } })
    setModalMs(null)
  }

  const clearMs = async () => {
    const next = { ...milestones }
    delete next[modalMs.id]
    await updateShared({ milestones: next })
    setModalMs(null)
  }

  const saveAnn = async () => {
    if (!annInput) return
    await updateShared({ annDate: annInput })
    setShowDatePicker(false)
  }

  const toInputDate = (display) => {
    try { return new Date(display).toISOString().split('T')[0] } catch { return '' }
  }

  const doneCount = Object.keys(milestones).length

  return (
    <div style={{ flex: 1, padding: 16, overflowY: 'auto' }}>
      <div style={{ textAlign: 'center', padding: '20px 0 12px' }}>
        <h2 style={{ fontSize: 22, fontWeight: 600 }}>Hey, {currentUser} 👋</h2>
        <p style={{ color: 'var(--muted)', fontSize: 13, marginTop: 4 }}>You &amp; {currentUser === 'M' ? 'N' : 'M'} — always &amp; forever</p>
      </div>

      {/* Ping */}
      <div className="card">
        <div className="card-title">💝 Thinking of You</div>
        <button
          onClick={handlePing}
          style={{
            width: '100%', padding: 16, background: pingState === 'sent' ? 'var(--card)' : 'var(--pink)',
            color: pingState === 'sent' ? 'var(--pink)' : '#fff', border: pingState === 'sent' ? '0.5px solid var(--pink)' : 'none',
            borderRadius: 12, fontSize: 16, fontWeight: 500, cursor: 'pointer', margin: '8px 0',
          }}
        >
          {pingState === 'sent' ? `💗 Sent to ${currentUser === 'M' ? 'N' : 'M'}!` : `Hold to send a little heart to ${currentUser === 'M' ? 'N' : 'M'}`}
        </button>
        {pingState === 'sent' && <p style={{ textAlign: 'center', fontSize: 12, color: 'var(--muted)', marginTop: 6 }}>{currentUser === 'M' ? 'N' : 'M'} will feel your love 🥺</p>}
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
            return (
              <div
                key={ms.id}
                onClick={() => openMs(ms)}
                style={{
                  background: saved ? '#1a0e18' : 'var(--card2)',
                  border: `0.5px solid ${saved ? 'var(--pink)' : 'var(--border)'}`,
                  borderRadius: 10, padding: '10px 12px', cursor: 'pointer', position: 'relative',
                }}
              >
                {saved && <span style={{ position: 'absolute', top: 7, right: 8, fontSize: 12, color: 'var(--pink)' }}>✓</span>}
                <span style={{ fontSize: 22, marginBottom: 4, display: 'block', opacity: saved ? 1 : 0.4 }}>{ms.icon}</span>
                <div style={{ fontSize: 12, fontWeight: 500, lineHeight: 1.3 }}>{ms.name}</div>
                {saved && <div style={{ fontSize: 10, color: 'var(--pink)', marginTop: 3 }}>{saved}</div>}
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
            <div style={{ fontSize: 13, color: 'var(--muted)', marginBottom: 14 }}>{milestones[modalMs.id] ? `You marked this on ${milestones[modalMs.id]}` : 'When did this happen?'}</div>
            <input type="date" value={msDate} onChange={e => setMsDate(e.target.value)}
              style={{ width: '100%', background: 'var(--card2)', border: '0.5px solid var(--border)', borderRadius: 8, color: 'var(--text)', padding: '8px 10px', fontSize: 14, marginBottom: 10 }} />
            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={() => setModalMs(null)} style={{ padding: '10px 16px', background: 'none', border: '0.5px solid var(--border)', borderRadius: 8, color: 'var(--muted)', cursor: 'pointer', fontSize: 14 }}>Cancel</button>
              <button onClick={saveMs} style={{ flex: 1, padding: 10, background: 'var(--pink)', color: '#fff', border: 'none', borderRadius: 8, cursor: 'pointer', fontSize: 14, fontWeight: 500 }}>Mark as done ✓</button>
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
