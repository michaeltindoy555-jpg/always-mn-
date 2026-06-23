import { useState } from 'react'
import { addJournalEntry } from '../firebase/firestore'

export default function JournalTab({ currentUser, journal }) {
  const [text, setText] = useState('')

  const handleAdd = async () => {
    if (!text.trim()) return
    await addJournalEntry({ author: currentUser, text: text.trim(), date: new Date().toLocaleDateString() })
    setText('')
  }

  return (
    <div style={{ flex: 1, padding: 16, overflowY: 'auto' }}>
      <div className="card">
        <div className="card-title">✍️ New entry</div>
        <textarea
          value={text}
          onChange={e => setText(e.target.value)}
          placeholder="Write something for both of you..."
          style={{ width: '100%', background: 'var(--card2)', border: '0.5px solid var(--border)', borderRadius: 8, color: 'var(--text)', padding: 10, fontSize: 14, resize: 'none', minHeight: 100 }}
        />
        <button onClick={handleAdd} style={{ marginTop: 8, padding: '10px 20px', background: 'var(--pink)', color: '#fff', border: 'none', borderRadius: 8, cursor: 'pointer', fontSize: 14, fontWeight: 500 }}>Add entry</button>
      </div>
      <div className="card">
        <div className="card-title">📖 Shared journal</div>
        {journal.length === 0
          ? <p style={{ color: 'var(--muted)', fontSize: 13 }}>No entries yet.</p>
          : journal.map(e => (
            <div key={e.id} style={{ padding: '10px 0', borderBottom: '0.5px solid var(--border)' }}>
              <div style={{ fontSize: 11, color: 'var(--muted)', marginBottom: 4 }}>
                <span style={{ display: 'inline-block', background: 'var(--pink-light)', color: '#72243e', borderRadius: 4, padding: '1px 6px', fontSize: 10, fontWeight: 600, marginRight: 4 }}>{e.author}</span>
                {e.date}
              </div>
              <div style={{ fontSize: 14 }}>{e.text}</div>
            </div>
          ))
        }
      </div>
    </div>
  )
}
