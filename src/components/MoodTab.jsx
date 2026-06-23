import { updateShared } from '../firebase/firestore'

const MOODS = [
  { emoji: '😍', label: 'In love' }, { emoji: '😊', label: 'Happy' },
  { emoji: '😌', label: 'Calm' },    { emoji: '🥺', label: 'Missing you' },
  { emoji: '😴', label: 'Tired' },   { emoji: '😢', label: 'Sad' },
  { emoji: '🤩', label: 'Excited' }, { emoji: '😤', label: 'Stressed' },
]

export default function MoodTab({ currentUser, shared }) {
  const moods = shared.moods || { M: null, N: null }

  const setMood = async (emoji, label) => {
    await updateShared({ moods: { ...moods, [currentUser]: { emoji, label } } })
  }

  return (
    <div style={{ flex: 1, padding: 16, overflowY: 'auto' }}>
      <div className="card">
        <div className="card-title">How are you feeling right now?</div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {MOODS.map(m => (
            <button key={m.label} onClick={() => setMood(m.emoji, m.label)}
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
      <div className="card">
        <div className="card-title">Current moods</div>
        {['M', 'N'].every(u => !moods[u])
          ? <p style={{ color: 'var(--muted)', fontSize: 13 }}>No moods set yet.</p>
          : ['M', 'N'].map(u => moods[u] && (
            <div key={u} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 0', borderBottom: '0.5px solid var(--border)' }}>
              <div style={{ width: 32, height: 32, borderRadius: '50%', background: '#fbeaf0', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18 }}>{moods[u].emoji}</div>
              <div>
                <div style={{ fontSize: 13, fontWeight: 500 }}>{u}</div>
                <div style={{ fontSize: 12, color: 'var(--muted)' }}>{moods[u].label}</div>
              </div>
            </div>
          ))
        }
      </div>
    </div>
  )
}
