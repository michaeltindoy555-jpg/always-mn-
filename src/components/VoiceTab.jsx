import { useState, useRef } from 'react'

export default function VoiceTab({ currentUser }) {
  const [recording, setRecording] = useState(false)
  const [secs, setSecs] = useState(0)
  const [inbox, setInbox] = useState([])
  const timerRef = useRef(null)
  const secsRef = useRef(0)

  const startRec = () => {
    setRecording(true)
    secsRef.current = 0
    setSecs(0)
    timerRef.current = setInterval(() => {
      secsRef.current++
      setSecs(secsRef.current)
    }, 1000)
  }

  const stopRec = () => {
    clearInterval(timerRef.current)
    setRecording(false)
    const dur = secsRef.current
    if (dur > 0) {
      setInbox(prev => [{ id: Date.now(), from: currentUser, dur, played: false, time: 'just now' }, ...prev])
    }
    setSecs(0)
  }

  const playVoice = (id) => {
    setInbox(prev => prev.map(v => v.id === id ? { ...v, played: true } : v))
    setTimeout(() => setInbox(prev => prev.filter(v => v.id !== id)), 1200)
  }

  const partner = currentUser === 'M' ? 'N' : 'M'

  return (
    <div style={{ flex: 1, padding: 16, overflowY: 'auto' }}>
      <div className="card" style={{ textAlign: 'center', padding: 20 }}>
        <div style={{ fontSize: 12, fontWeight: 500, textTransform: 'uppercase', letterSpacing: 1, color: 'var(--muted)', marginBottom: 8 }}>WALKIE-TALKIE</div>
        <p style={{ color: 'var(--muted)', fontSize: 13, marginBottom: 20 }}>Hold to record. Message plays once then disappears.</p>
        <button
          onMouseDown={startRec} onMouseUp={stopRec}
          onTouchStart={startRec} onTouchEnd={stopRec}
          style={{
            width: 80, height: 80, borderRadius: '50%',
            background: recording ? 'var(--pink)' : 'var(--card2)',
            border: `2px solid ${recording ? 'var(--pink)' : 'var(--border)'}`,
            color: recording ? '#fff' : 'var(--muted)',
            cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
            margin: '0 auto', fontSize: 32,
            animation: recording ? 'pulse 1s infinite' : 'none',
          }}>
          <i className="ti ti-microphone" />
        </button>
        <p style={{ marginTop: 10, fontSize: 13, color: 'var(--muted)' }}>
          {recording ? `Recording... ${secs}s` : `Hold to record a message for ${partner}`}
        </p>
      </div>
      <div style={{ fontSize: 12, fontWeight: 500, textTransform: 'uppercase', letterSpacing: 1, color: 'var(--muted)', margin: '16px 0 8px' }}>INBOX</div>
      {inbox.length === 0
        ? <p style={{ color: 'var(--muted)', fontSize: 13, textAlign: 'center' }}>No messages yet.</p>
        : inbox.map(v => (
          <div key={v.id} style={{ background: 'var(--card)', border: '0.5px solid var(--pink)', borderRadius: 10, padding: 12, marginBottom: 8, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <div style={{ fontSize: 12, color: 'var(--pink)', marginBottom: 4 }}>from {v.from}</div>
              <div style={{ fontSize: 11, color: 'var(--muted)' }}>{v.time} · 0:{String(v.dur).padStart(2, '0')}</div>
            </div>
            {v.played
              ? <span style={{ fontSize: 11, color: 'var(--muted)', fontStyle: 'italic' }}>played &amp; deleted</span>
              : <button onClick={() => playVoice(v.id)} style={{ padding: '6px 14px', background: 'var(--pink)', color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: 12 }}>▶ Play once</button>
            }
          </div>
        ))
      }
    </div>
  )
}
