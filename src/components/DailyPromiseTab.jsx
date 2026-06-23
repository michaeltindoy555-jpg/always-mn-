import { useState } from 'react'
import { updateShared } from '../firebase/firestore'

export default function DailyPromiseTab({ currentUser, shared }) {
  const [input, setInput] = useState('')
  const partner = currentUser === 'M' ? 'N' : 'M'
  const todayKey = new Date().toDateString()

  const promises = shared.promises || {}
  const todayPromises = promises[todayKey] || { M: null, N: null }

  const myPromise = todayPromises[currentUser]
  const partnerPromise = todayPromises[partner]

  const savePromise = async () => {
    if (!input.trim()) return
    const next = {
      ...promises,
      [todayKey]: {
        ...todayPromises,
        [currentUser]: { text: input.trim(), done: false }
      }
    }
    await updateShared({ promises: next })
    setInput('')
  }

  const toggleDone = async () => {
    if (!myPromise) return
    const next = {
      ...promises,
      [todayKey]: {
        ...todayPromises,
        [currentUser]: { ...myPromise, done: !myPromise.done }
      }
    }
    await updateShared({ promises: next })
  }

  const clearMyPromise = async () => {
    const next = {
      ...promises,
      [todayKey]: { ...todayPromises, [currentUser]: null }
    }
    await updateShared({ promises: next })
  }

  // Past promises (last 5 days, not today)
  const pastDays = Object.keys(promises)
    .filter(k => k !== todayKey)
    .sort((a, b) => new Date(b) - new Date(a))
    .slice(0, 5)

  return (
    <div style={{ flex: 1, padding: 16, overflowY: 'auto' }}>
      <div style={{ textAlign: 'center', padding: '16px 0 8px' }}>
        <div style={{ fontSize: 28, marginBottom: 4 }}>🤝</div>
        <h2 style={{ fontSize: 18, fontWeight: 600 }}>Daily Promise</h2>
        <p style={{ fontSize: 13, color: 'var(--muted)', marginTop: 4 }}>One small thing you'll do for each other today</p>
        <p style={{ fontSize: 11, color: 'var(--muted)', marginTop: 2 }}>{new Date().toLocaleDateString('en-PH', { weekday: 'long', month: 'long', day: 'numeric' })}</p>
      </div>

      {/* My promise */}
      <div className="card">
        <div className="card-title">🫵 Your promise today</div>
        {myPromise ? (
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '6px 0' }}>
              <input type="checkbox" checked={myPromise.done} onChange={toggleDone}
                style={{ width: 20, height: 20, accentColor: 'var(--pink)', cursor: 'pointer' }} />
              <span style={{
                flex: 1, fontSize: 15,
                textDecoration: myPromise.done ? 'line-through' : 'none',
                color: myPromise.done ? 'var(--muted)' : 'var(--text)'
              }}>{myPromise.text}</span>
            </div>
            {myPromise.done && (
              <p style={{ fontSize: 12, color: 'var(--pink)', marginTop: 6 }}>Promise kept! 💗</p>
            )}
            <button onClick={clearMyPromise}
              style={{ marginTop: 8, background: 'none', border: 'none', color: 'var(--muted)', fontSize: 12, cursor: 'pointer', padding: 0 }}>
              Change my promise
            </button>
          </div>
        ) : (
          <div>
            <input
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && savePromise()}
              placeholder={`e.g. "I'll text ${partner} before I sleep"`}
              style={{ width: '100%', background: 'var(--card2)', border: '0.5px solid var(--border)', borderRadius: 8, color: 'var(--text)', padding: '10px 12px', fontSize: 14, marginBottom: 8 }}
            />
            <button onClick={savePromise}
              style={{ padding: '10px 20px', background: 'var(--pink)', color: '#fff', border: 'none', borderRadius: 8, cursor: 'pointer', fontSize: 14, fontWeight: 500 }}>
              Make this promise 🤝
            </button>
          </div>
        )}
      </div>

      {/* Partner's promise */}
      <div className="card">
        <div className="card-title">💗 {partner}'s promise today</div>
        {partnerPromise ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ fontSize: 18 }}>{partnerPromise.done ? '✅' : '⏳'}</span>
            <span style={{
              flex: 1, fontSize: 15,
              textDecoration: partnerPromise.done ? 'line-through' : 'none',
              color: partnerPromise.done ? 'var(--muted)' : 'var(--text)'
            }}>{partnerPromise.text}</span>
          </div>
        ) : (
          <p style={{ color: 'var(--muted)', fontSize: 13 }}>{partner} hasn't made a promise yet today...</p>
        )}
      </div>

      {/* Past promises */}
      {pastDays.length > 0 && (
        <div className="card">
          <div className="card-title">📜 Past promises</div>
          {pastDays.map(day => {
            const dp = promises[day]
            return (
              <div key={day} style={{ padding: '8px 0', borderBottom: '0.5px solid var(--border)' }}>
                <div style={{ fontSize: 11, color: 'var(--muted)', marginBottom: 4 }}>{day}</div>
                {['M', 'N'].map(u => dp[u] && (
                  <div key={u} style={{ fontSize: 13, display: 'flex', alignItems: 'center', gap: 6, marginBottom: 2 }}>
                    <span style={{ color: 'var(--pink)', fontWeight: 600, fontSize: 11 }}>{u}</span>
                    <span style={{ color: dp[u].done ? 'var(--muted)' : 'var(--text)', textDecoration: dp[u].done ? 'line-through' : 'none' }}>{dp[u].text}</span>
                    {dp[u].done && <span style={{ fontSize: 11 }}>✓</span>}
                  </div>
                ))}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
