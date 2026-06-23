import { useState } from 'react'
import { addJournalEntry, deleteJournalEntry, updateJournalEntry } from '../firebase/firestore'

const REACTIONS = ['❤️', '😂', '🥺', '😍', '💯', '🫶']

export default function JournalTab({ currentUser, journal }) {
  const [text, setText] = useState('')
  const [confirmDelete, setConfirmDelete] = useState(null)
  const [weeklyRecap, setWeeklyRecap] = useState('')
  const [loadingRecap, setLoadingRecap] = useState(false)
  const [showRecap, setShowRecap] = useState(false)

  const handleAdd = async () => {
    if (!text.trim()) return
    await addJournalEntry({ author: currentUser, text: text.trim(), date: new Date().toLocaleDateString(), reactions: {} })
    setText('')
  }

  const handleDelete = async (id) => {
    await deleteJournalEntry(id)
    setConfirmDelete(null)
  }

  const handleReact = async (entry, emoji) => {
    const reactions = entry.reactions || {}
    const current = reactions[currentUser]
    // Toggle off if same emoji, else set new one
    const next = { ...reactions, [currentUser]: current === emoji ? null : emoji }
    await updateJournalEntry(entry.id, { reactions: next })
  }

  const getWeeklyRecap = async () => {
    setLoadingRecap(true)
    setWeeklyRecap('')
    setShowRecap(true)
    try {
      // Get last 7 days of entries
      const sevenDaysAgo = Date.now() - 7 * 24 * 60 * 60 * 1000
      const recent = journal.filter(e => {
        const d = new Date(e.date)
        return d.getTime() >= sevenDaysAgo
      })
      if (recent.length === 0) {
        setWeeklyRecap("No journal entries this week yet — write something together and I'll recap it! 💕")
        setLoadingRecap(false)
        return
      }
      const summary = recent.map(e => `[${e.author} on ${e.date}]: ${e.text}`).join('\n\n')
      const res = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'anthropic-version': '2023-06-01',
          'anthropic-dangerous-direct-browser-access': 'true',
          'x-api-key': import.meta.env.VITE_ANTHROPIC_KEY
        },
        body: JSON.stringify({
          model: 'claude-sonnet-4-6',
          max_tokens: 300,
          messages: [{
            role: 'user',
            content: `You are a warm, sweet relationship assistant for a long-distance couple — M in Cabadbaran City and N in Liloan, Southern Leyte, Philippines. Here are their shared journal entries from this week:\n\n${summary}\n\nWrite a heartfelt "This Week in Your Relationship" recap in 3–4 sentences. Highlight themes, sweet moments, and growth you noticed. Be warm, personal, and encouraging. End with a loving note. Don't use bullet points or headers.`
          }]
        })
      })
      const data = await res.json()
      const recapText = (data.content || []).map(c => c.text || '').join('').trim()
      setWeeklyRecap(recapText)
    } catch {
      setWeeklyRecap('Could not load recap right now. Try again later! 💕')
    }
    setLoadingRecap(false)
  }

  return (
    <div style={{ flex: 1, padding: 16, overflowY: 'auto' }}>

      {/* Weekly Recap Button */}
      <div className="card" style={{ background: 'linear-gradient(135deg, #1a0e18 0%, #0d1520 100%)', border: '0.5px solid var(--pink)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: showRecap ? 12 : 0 }}>
          <div>
            <div className="card-title" style={{ margin: 0 }}>🗓️ This Week in Your Relationship</div>
            <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 2 }}>AI recap of your shared journal</div>
          </div>
          <button
            onClick={getWeeklyRecap}
            disabled={loadingRecap}
            style={{
              padding: '8px 14px',
              background: loadingRecap ? 'var(--card2)' : 'var(--pink)',
              color: loadingRecap ? 'var(--muted)' : '#fff',
              border: 'none', borderRadius: 8, cursor: loadingRecap ? 'default' : 'pointer',
              fontSize: 12, fontWeight: 500, whiteSpace: 'nowrap'
            }}>
            {loadingRecap ? 'Writing... 💭' : showRecap ? 'Refresh ✨' : 'Get recap ✨'}
          </button>
        </div>
        {showRecap && (
          <div>
            {loadingRecap
              ? <div style={{ fontSize: 13, color: 'var(--muted)', textAlign: 'center', padding: '10px 0' }}>Reflecting on your week together... 💕</div>
              : weeklyRecap
                ? <p style={{ fontSize: 14, lineHeight: 1.7, color: 'var(--text)', margin: 0, fontStyle: 'italic' }}>{weeklyRecap}</p>
                : null
            }
          </div>
        )}
      </div>

      {/* New entry */}
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

      {/* Journal entries */}
      <div className="card">
        <div className="card-title">📖 Shared journal</div>
        {journal.length === 0
          ? <p style={{ color: 'var(--muted)', fontSize: 13 }}>No entries yet.</p>
          : journal.map(e => (
            <div key={e.id} style={{ padding: '10px 0', borderBottom: '0.5px solid var(--border)' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
                <div style={{ fontSize: 11, color: 'var(--muted)' }}>
                  <span style={{ display: 'inline-block', background: 'var(--pink-light)', color: '#72243e', borderRadius: 4, padding: '1px 6px', fontSize: 10, fontWeight: 600, marginRight: 4 }}>{e.author}</span>
                  {e.date}
                </div>
                {e.author === currentUser && (
                  confirmDelete === e.id ? (
                    <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                      <span style={{ fontSize: 11, color: 'var(--muted)' }}>Delete?</span>
                      <button onClick={() => handleDelete(e.id)}
                        style={{ background: '#a32d2d', border: 'none', color: '#fff', cursor: 'pointer', fontSize: 11, borderRadius: 4, padding: '2px 8px' }}>Yes</button>
                      <button onClick={() => setConfirmDelete(null)}
                        style={{ background: 'none', border: '0.5px solid var(--border)', color: 'var(--muted)', cursor: 'pointer', fontSize: 11, borderRadius: 4, padding: '2px 8px' }}>No</button>
                    </div>
                  ) : (
                    <button onClick={() => setConfirmDelete(e.id)}
                      style={{ background: 'none', border: 'none', color: 'var(--muted)', cursor: 'pointer', fontSize: 14, padding: '0 4px' }}>
                      <i className="ti ti-trash" />
                    </button>
                  )
                )}
              </div>

              <div style={{ fontSize: 14, marginBottom: 8 }}>{e.text}</div>

              {/* Emoji reactions */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                {REACTIONS.map(emoji => {
                  const reactions = e.reactions || {}
                  // Count how many users reacted with this emoji
                  const count = Object.values(reactions).filter(r => r === emoji).length
                  const myReaction = reactions[currentUser] === emoji
                  return (
                    <button
                      key={emoji}
                      onClick={() => handleReact(e, emoji)}
                      style={{
                        padding: '3px 8px',
                        background: myReaction ? 'var(--pink-light)' : 'var(--card2)',
                        border: `0.5px solid ${myReaction ? 'var(--pink)' : 'var(--border)'}`,
                        borderRadius: 20,
                        cursor: 'pointer',
                        fontSize: 14,
                        display: 'flex', alignItems: 'center', gap: 3,
                        transition: 'all .15s'
                      }}
                    >
                      {emoji}
                      {count > 0 && <span style={{ fontSize: 10, color: myReaction ? 'var(--pink)' : 'var(--muted)', fontWeight: 600 }}>{count}</span>}
                    </button>
                  )
                })}
              </div>
            </div>
          ))
        }
      </div>
    </div>
  )
}
