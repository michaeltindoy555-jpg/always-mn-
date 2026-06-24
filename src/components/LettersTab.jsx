import { useState } from 'react'
import { addLetter } from '../firebase/firestore'

export default function LettersTab({ currentUser, letters }) {
  const [title, setTitle] = useState('')
  const [body, setBody] = useState('')
  const [revealDate, setRevealDate] = useState('')
  const [isTimeCapsule, setIsTimeCapsule] = useState(false)
  const [openLetter, setOpenLetter] = useState(null)

  const today = new Date().toISOString().split('T')[0]

  const handleAdd = async () => {
    if (!title.trim() || !body.trim()) return
    if (isTimeCapsule && !revealDate) return alert('Please set a reveal date for your time capsule.')
    await addLetter({
      from: currentUser,
      title: title.trim(),
      body: body.trim(),
      date: new Date().toLocaleDateString(),
      isTimeCapsule: isTimeCapsule,
      revealDate: isTimeCapsule ? revealDate : null,
    })
    setTitle(''); setBody(''); setRevealDate(''); setIsTimeCapsule(false)
  }

  const isSealed = (letter) => {
    if (!letter.isTimeCapsule || !letter.revealDate) return false
    return new Date(letter.revealDate) > new Date()
  }

  const daysUntilReveal = (revealDate) => {
    const diff = new Date(revealDate) - new Date()
    return Math.ceil(diff / (1000 * 60 * 60 * 24))
  }

  if (openLetter) return (
    <div style={{ flex: 1, padding: 16, overflowY: 'auto' }}>
      <button onClick={() => setOpenLetter(null)} style={{ background: 'none', border: 'none', color: 'var(--pink)', cursor: 'pointer', fontSize: 13, marginBottom: 12, display: 'flex', alignItems: 'center', gap: 4 }}>
        <i className="ti ti-arrow-left" /> Back to vault
      </button>
      <div className="card">
        {openLetter.isTimeCapsule && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 12, background: 'rgba(212,83,126,0.08)', border: '0.5px solid rgba(212,83,126,0.3)', borderRadius: 8, padding: '6px 10px' }}>
            <span>⏳</span>
            <span style={{ fontSize: 11, color: 'var(--pink)' }}>Time Capsule · Revealed {new Date(openLetter.revealDate).toLocaleDateString('en-PH', { month: 'long', day: 'numeric', year: 'numeric' })}</span>
          </div>
        )}
        <div style={{ fontSize: 18, fontWeight: 600, marginBottom: 6 }}>{openLetter.title}</div>
        <div style={{ fontSize: 11, color: 'var(--muted)', marginBottom: 14 }}>From {openLetter.from} · {openLetter.date}</div>
        <div style={{ lineHeight: 1.7, fontSize: 14, whiteSpace: 'pre-wrap' }}>{openLetter.body}</div>
      </div>
    </div>
  )

  return (
    <div style={{ flex: 1, padding: 16, overflowY: 'auto' }}>
      <div className="card">
        <div className="card-title">💌 Write a love letter</div>

        {/* Time capsule toggle */}
        <div
          onClick={() => setIsTimeCapsule(v => !v)}
          style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: '10px 12px', borderRadius: 10, cursor: 'pointer', marginBottom: 10,
            background: isTimeCapsule ? 'rgba(212,83,126,0.08)' : 'var(--card2)',
            border: `0.5px solid ${isTimeCapsule ? 'rgba(212,83,126,0.4)' : 'var(--border)'}`,
            transition: 'all .2s',
          }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 18 }}>⏳</span>
            <div>
              <div style={{ fontSize: 13, fontWeight: 500, color: isTimeCapsule ? 'var(--pink)' : 'var(--text)' }}>Time Capsule</div>
              <div style={{ fontSize: 11, color: 'var(--muted)' }}>Seal until a future date</div>
            </div>
          </div>
          <div style={{
            width: 36, height: 20, borderRadius: 10, position: 'relative', transition: 'background .2s',
            background: isTimeCapsule ? 'var(--pink)' : 'var(--border)',
          }}>
            <div style={{
              position: 'absolute', top: 3, left: isTimeCapsule ? 18 : 3, width: 14, height: 14,
              borderRadius: '50%', background: '#fff', transition: 'left .2s',
            }} />
          </div>
        </div>

        {/* Reveal date picker */}
        {isTimeCapsule && (
          <div style={{ marginBottom: 10 }}>
            <label style={{ fontSize: 11, color: 'var(--muted)', display: 'block', marginBottom: 4, textTransform: 'uppercase', letterSpacing: 1 }}>Reveal date</label>
            <input
              type="date"
              value={revealDate}
              min={today}
              onChange={e => setRevealDate(e.target.value)}
              style={{ width: '100%', background: 'var(--card2)', border: '0.5px solid var(--border)', borderRadius: 8, color: 'var(--text)', padding: '8px 10px', fontSize: 14 }}
            />
            {revealDate && (
              <div style={{ fontSize: 11, color: 'var(--pink)', marginTop: 4 }}>
                🔒 This letter will be sealed for {daysUntilReveal(revealDate)} day{daysUntilReveal(revealDate) !== 1 ? 's' : ''}
              </div>
            )}
          </div>
        )}

        <input value={title} onChange={e => setTitle(e.target.value)} placeholder="Title..."
          style={{ width: '100%', background: 'var(--card2)', border: '0.5px solid var(--border)', borderRadius: 8, color: 'var(--text)', padding: '8px 10px', fontSize: 14, marginBottom: 8 }} />
        <textarea value={body} onChange={e => setBody(e.target.value)} placeholder={`Dear ${currentUser === 'M' ? 'N' : 'M'}...`}
          style={{ width: '100%', background: 'var(--card2)', border: '0.5px solid var(--border)', borderRadius: 8, color: 'var(--text)', padding: 10, fontSize: 14, resize: 'none', minHeight: 120 }} />
        <button onClick={handleAdd}
          style={{ marginTop: 8, padding: '10px 20px', background: 'var(--pink)', color: '#fff', border: 'none', borderRadius: 8, cursor: 'pointer', fontSize: 14, fontWeight: 500 }}>
          {isTimeCapsule ? '🔒 Seal & Lock' : '💌 Seal & Send'}
        </button>
      </div>

      <div className="card">
        <div className="card-title">💝 Love letters vault</div>
        {letters.length === 0
          ? <p style={{ color: 'var(--muted)', fontSize: 13 }}>No letters yet.</p>
          : letters.map(l => {
            const sealed = isSealed(l)
            return (
              <div key={l.id}
                onClick={() => !sealed && setOpenLetter(l)}
                style={{
                  padding: 10, border: `0.5px solid ${sealed ? 'rgba(212,83,126,0.2)' : 'var(--border)'}`,
                  borderRadius: 8, marginBottom: 8,
                  cursor: sealed ? 'default' : 'pointer',
                  background: sealed ? 'rgba(212,83,126,0.04)' : 'transparent',
                  opacity: sealed ? 0.85 : 1,
                }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, flex: 1 }}>
                    {sealed && <span style={{ fontSize: 16 }}>🔒</span>}
                    {!sealed && l.isTimeCapsule && <span style={{ fontSize: 14 }}>⏳</span>}
                    <span style={{ fontWeight: 500, fontSize: 14, color: sealed ? 'var(--muted)' : 'var(--text)' }}>
                      {sealed ? '????' : l.title}
                    </span>
                  </div>
                  <span style={{ fontSize: 11, color: 'var(--muted)', whiteSpace: 'nowrap', marginLeft: 8 }}>{l.from} · {l.date}</span>
                </div>
                {sealed ? (
                  <div style={{ fontSize: 11, color: 'var(--pink)', marginTop: 4 }}>
                    Sealed · reveals {new Date(l.revealDate).toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' })} ({daysUntilReveal(l.revealDate)}d)
                  </div>
                ) : (
                  <div style={{ fontSize: 13, color: 'var(--muted)', marginTop: 4, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{l.body}</div>
                )}
              </div>
            )
          })
        }
      </div>
    </div>
  )
}
