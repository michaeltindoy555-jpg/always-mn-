import { useState } from 'react'
import { addLetter } from '../firebase/firestore'

export default function LettersTab({ currentUser, letters }) {
  const [title, setTitle] = useState('')
  const [body, setBody] = useState('')
  const [openLetter, setOpenLetter] = useState(null)

  const handleAdd = async () => {
    if (!title.trim() || !body.trim()) return
    await addLetter({ from: currentUser, title: title.trim(), body: body.trim(), date: new Date().toLocaleDateString() })
    setTitle(''); setBody('')
  }

  if (openLetter) return (
    <div style={{ flex: 1, padding: 16, overflowY: 'auto' }}>
      <button onClick={() => setOpenLetter(null)} style={{ background: 'none', border: 'none', color: 'var(--pink)', cursor: 'pointer', fontSize: 13, marginBottom: 12, display: 'flex', alignItems: 'center', gap: 4 }}>
        <i className="ti ti-arrow-left" /> Back to vault
      </button>
      <div className="card">
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
        <input value={title} onChange={e => setTitle(e.target.value)} placeholder="Title..."
          style={{ width: '100%', background: 'var(--card2)', border: '0.5px solid var(--border)', borderRadius: 8, color: 'var(--text)', padding: '8px 10px', fontSize: 14, marginBottom: 8 }} />
        <textarea value={body} onChange={e => setBody(e.target.value)} placeholder={`Dear ${currentUser === 'M' ? 'N' : 'M'}...`}
          style={{ width: '100%', background: 'var(--card2)', border: '0.5px solid var(--border)', borderRadius: 8, color: 'var(--text)', padding: 10, fontSize: 14, resize: 'none', minHeight: 120 }} />
        <button onClick={handleAdd} style={{ marginTop: 8, padding: '10px 20px', background: 'var(--pink)', color: '#fff', border: 'none', borderRadius: 8, cursor: 'pointer', fontSize: 14, fontWeight: 500 }}>Seal &amp; Send</button>
      </div>
      <div className="card">
        <div className="card-title">💝 Love letters vault</div>
        {letters.length === 0
          ? <p style={{ color: 'var(--muted)', fontSize: 13 }}>No letters yet.</p>
          : letters.map(l => (
            <div key={l.id} onClick={() => setOpenLetter(l)}
              style={{ padding: 10, border: '0.5px solid var(--border)', borderRadius: 8, marginBottom: 8, cursor: 'pointer' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontWeight: 500, fontSize: 14 }}>{l.title}</span>
                <span style={{ fontSize: 11, color: 'var(--muted)' }}>{l.from} · {l.date}</span>
              </div>
              <div style={{ fontSize: 13, color: 'var(--muted)', marginTop: 4, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{l.body}</div>
            </div>
          ))
        }
      </div>
    </div>
  )
}
