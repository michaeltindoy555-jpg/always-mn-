import { useState } from 'react'
import { updateShared } from '../firebase/firestore'

const MOODS = [
  { emoji: '😍', label: 'In love' }, { emoji: '😊', label: 'Happy' },
  { emoji: '😌', label: 'Calm' },    { emoji: '🥺', label: 'Missing you' },
  { emoji: '😴', label: 'Tired' },   { emoji: '😢', label: 'Sad' },
  { emoji: '🤩', label: 'Excited' }, { emoji: '😤', label: 'Stressed' },
]

export default function MoodTab({ currentUser, shared }) {
  const moods = shared.moods || { M: null, N: null }
  const moodHistory = shared.moodHistory || []
  const [insight, setInsight] = useState('')
  const [loadingInsight, setLoadingInsight] = useState(false)

  const setMood = async (emoji, label) => {
    const next = { ...moods, [currentUser]: { emoji, label } }
    const entry = { user: currentUser, emoji, label, date: new Date().toLocaleDateString('en-PH') }
    const history = [entry, ...moodHistory].slice(0, 20)
    await updateShared({ moods: next, moodHistory: history })
  }

  const getInsight = async () => {
    if (moodHistory.length < 2) {
      setInsight('Log a few more moods first so I have something to work with! 💕')
      return
    }
    setLoadingInsight(true)
    setInsight('')
    try {
      const summary = moodHistory.map(h => `${h.date} — ${h.user}: ${h.emoji} ${h.label}`).join('\n')
      const res = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'anthropic-version': '2023-06-01',
          'anthropic-dangerous-direct-browser-access': 'true',
          'x-api-key': import.meta.env.VITE_ANTHROPIC_KEY,
        },
        body: JSON.stringify({
          model: 'claude-sonnet-4-6', max_tokens: 200,
          messages: [{
            role: 'user',
            content: `You are a warm, sweet relationship assistant for a long-distance couple (M in Cabadbaran City, N in Liloan Southern Leyte Philippines). Here is their recent mood log:\n\n${summary}\n\nWrite a short, warm 2-3 sentence insight about their mood patterns. Be encouraging and loving. Keep it casual and sweet, like a close friend. Don't use bullet points.`
          }]
        })
      })
      const data = await res.json()
      const text = (data.content || []).map(c => c.text || '').join('').trim()
      setInsight(text)
    } catch {
      setInsight('Could not load insight right now. Try again later! 💕')
    }
    setLoadingInsight(false)
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

      {moodHistory.length > 0 && (
        <div className="card">
          <div className="card-title" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span>📊 Recent mood log</span>
            <span style={{ fontSize: 10, color: 'var(--muted)' }}>{moodHistory.length} entries</span>
          </div>
          {moodHistory.slice(0, 6).map((h, i) => (
            <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '5px 0', borderBottom: '0.5px solid var(--border)', fontSize: 12 }}>
              <span style={{ color: 'var(--pink)', fontWeight: 600, minWidth: 16 }}>{h.user}</span>
              <span style={{ flex: 1, paddingLeft: 8 }}>{h.emoji} {h.label}</span>
              <span style={{ color: 'var(--muted)' }}>{h.date}</span>
            </div>
          ))}
        </div>
      )}

      <div className="card">
        <div className="card-title">✨ Mood insights</div>
        {insight ? (
          <p style={{ fontSize: 14, lineHeight: 1.6, color: 'var(--text)', margin: '0 0 10px' }}>{insight}</p>
        ) : (
          <p style={{ fontSize: 13, color: 'var(--muted)', marginBottom: 10 }}>Let AI find patterns in your mood history and say something sweet about you two.</p>
        )}
        <button onClick={getInsight} disabled={loadingInsight}
          style={{ padding: '10px 20px', background: loadingInsight ? 'var(--card2)' : 'var(--pink)', color: loadingInsight ? 'var(--muted)' : '#fff', border: 'none', borderRadius: 8, cursor: loadingInsight ? 'default' : 'pointer', fontSize: 14, fontWeight: 500 }}>
          {loadingInsight ? 'Thinking... 💭' : insight ? 'Refresh insight ✨' : 'Get insight ✨'}
        </button>
      </div>
    </div>
  )
}
