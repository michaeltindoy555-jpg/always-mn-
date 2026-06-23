import { useState } from 'react'
import { addBucketItem, updateBucketItem, deleteBucketItem } from '../firebase/firestore'

export default function BucketTab({ bucket }) {
  const [input, setInput] = useState('')

  const handleAdd = async () => {
    if (!input.trim()) return
    await addBucketItem({ text: input.trim(), done: false })
    setInput('')
  }

  const done = bucket.filter(b => b.done).length
  const total = bucket.length

  return (
    <div style={{ flex: 1, padding: 16, overflowY: 'auto' }}>
      <div className="card">
        <div className="card-title">🎯 Our Bucket List</div>
        <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
          <input value={input} onChange={e => setInput(e.target.value)} placeholder="Add a dream or goal..."
            onKeyDown={e => e.key === 'Enter' && handleAdd()}
            style={{ flex: 1, background: 'var(--card2)', border: '0.5px solid var(--border)', borderRadius: 8, color: 'var(--text)', padding: '8px 10px', fontSize: 14 }} />
          <button onClick={handleAdd} style={{ padding: '8px 14px', background: 'var(--pink)', color: '#fff', border: 'none', borderRadius: 8, cursor: 'pointer', fontSize: 14 }}>
            <i className="ti ti-plus" />
          </button>
        </div>
        {bucket.length === 0
          ? <p style={{ color: 'var(--muted)', fontSize: 13 }}>Dream big together!</p>
          : bucket.map(b => (
            <div key={b.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 0', borderBottom: '0.5px solid var(--border)' }}>
              <input type="checkbox" checked={b.done} onChange={() => updateBucketItem(b.id, { done: !b.done })}
                style={{ width: 18, height: 18, accentColor: 'var(--pink)', cursor: 'pointer' }} />
              <span style={{ flex: 1, fontSize: 14, textDecoration: b.done ? 'line-through' : 'none', color: b.done ? 'var(--muted)' : 'var(--text)' }}>{b.text}</span>
              <button onClick={() => deleteBucketItem(b.id)} style={{ background: 'none', border: 'none', color: 'var(--muted)', cursor: 'pointer', fontSize: 14 }}>
                <i className="ti ti-trash" />
              </button>
            </div>
          ))
        }
      </div>
      <div className="card">
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, color: 'var(--muted)' }}>
          <span>Completed</span><span>{done} / {total}</span>
        </div>
        <div style={{ height: 6, background: 'var(--card2)', borderRadius: 3, marginTop: 6, overflow: 'hidden' }}>
          <div style={{ height: '100%', background: 'var(--pink)', borderRadius: 3, width: total ? `${done / total * 100}%` : '0%', transition: 'width .4s' }} />
        </div>
      </div>
    </div>
  )
}
