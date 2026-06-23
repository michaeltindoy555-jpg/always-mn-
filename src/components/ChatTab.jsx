import { useState, useEffect, useRef } from 'react'
import { subscribeChat, addChatMessage, deleteChatMessage, updateChatMessage } from '../firebase/firestore'
import { getPartnerToken, sendPushNotification } from '../firebase/fcm'

const REACTIONS = ['❤️', '😂', '🥺', '😍', '💯']

export default function ChatTab({ currentUser }) {
  const [messages, setMessages]     = useState([])
  const [input, setInput]           = useState('')
  const [sending, setSending]       = useState(false)
  const [reacting, setReacting]     = useState(null)   // message id showing picker
  const [confirmDel, setConfirmDel] = useState(null)
  const bottomRef = useRef()
  const inputRef  = useRef()
  const partner   = currentUser === 'M' ? 'N' : 'M'

  // ── Real-time listener ──────────────────────────────────────────────────────
  useEffect(() => {
    const unsub = subscribeChat(setMessages)
    return () => unsub()
  }, [])

  // ── Auto-scroll ─────────────────────────────────────────────────────────────
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // ── Send ────────────────────────────────────────────────────────────────────
  const handleSend = async () => {
    const text = input.trim()
    if (!text || sending) return
    setSending(true)
    setInput('')
    try {
      await addChatMessage({ from: currentUser, text, reaction: null })
      const token = await getPartnerToken(partner)
      await sendPushNotification({
        toToken: token,
        title:   `💬 ${currentUser} sent a message`,
        body:    text.length > 60 ? text.slice(0, 60) + '…' : text,
      })
    } catch (err) {
      console.error('Chat send error:', err)
      setInput(text)
    }
    setSending(false)
    inputRef.current?.focus()
  }

  // ── React ───────────────────────────────────────────────────────────────────
  const handleReact = async (msgId, emoji) => {
    await updateChatMessage(msgId, { reaction: emoji })
    setReacting(null)
  }

  // ── Delete ──────────────────────────────────────────────────────────────────
  const handleDelete = async (msgId) => {
    await deleteChatMessage(msgId)
    setConfirmDel(null)
  }

  // ── Helpers ─────────────────────────────────────────────────────────────────
  const formatTime = (ts) => {
    if (!ts) return ''
    const d = ts.toDate ? ts.toDate() : new Date(ts)
    const now = new Date()
    const isToday = d.toDateString() === now.toDateString()
    const yesterday = new Date(now); yesterday.setDate(now.getDate() - 1)
    const isYesterday = d.toDateString() === yesterday.toDateString()
    const time = d.toLocaleTimeString('en-PH', { hour: '2-digit', minute: '2-digit' })
    if (isToday)     return time
    if (isYesterday) return `Yesterday ${time}`
    return `${d.toLocaleDateString('en-PH', { month: 'short', day: 'numeric' })} ${time}`
  }

  const getDateLabel = (ts) => {
    if (!ts) return ''
    const d = ts.toDate ? ts.toDate() : new Date(ts)
    const now = new Date()
    if (d.toDateString() === now.toDateString()) return 'Today'
    const yesterday = new Date(now); yesterday.setDate(now.getDate() - 1)
    if (d.toDateString() === yesterday.toDateString()) return 'Yesterday'
    return d.toLocaleDateString('en-PH', { weekday: 'long', month: 'long', day: 'numeric' })
  }

  // ── Render ──────────────────────────────────────────────────────────────────
  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>

      {/* Header */}
      <div style={{ padding: '12px 16px 8px', borderBottom: '0.5px solid var(--border)', background: 'var(--card)', flexShrink: 0 }}>
        <div style={{ fontSize: 15, fontWeight: 600 }}>💬 M & N</div>
        <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 1 }}>Real-time chat · messages are saved forever</div>
      </div>

      {/* Message list */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '12px 12px 4px' }}>
        {messages.length === 0 && (
          <div style={{ textAlign: 'center', marginTop: 60 }}>
            <div style={{ fontSize: 36, marginBottom: 10 }}>💌</div>
            <p style={{ color: 'var(--muted)', fontSize: 14 }}>No messages yet.</p>
            <p style={{ color: 'var(--muted)', fontSize: 13 }}>Say something sweet 🥺</p>
          </div>
        )}

        {messages.map((msg, i) => {
          const isMe        = msg.from === currentUser
          const prevMsg     = messages[i - 1]
          const prevDate    = prevMsg?.createdAt ? getDateLabel(prevMsg.createdAt) : null
          const thisDate    = msg.createdAt ? getDateLabel(msg.createdAt) : null
          const showDivider = thisDate && thisDate !== prevDate

          return (
            <div key={msg.id}>
              {/* Date divider */}
              {showDivider && (
                <div style={{ textAlign: 'center', margin: '14px 0 10px' }}>
                  <span style={{ fontSize: 11, color: 'var(--muted)', background: 'var(--card2)', padding: '3px 10px', borderRadius: 10 }}>
                    {thisDate}
                  </span>
                </div>
              )}

              {/* Bubble row */}
              <div style={{ display: 'flex', justifyContent: isMe ? 'flex-end' : 'flex-start', marginBottom: 6, position: 'relative' }}>

                {/* Partner avatar */}
                {!isMe && (
                  <div style={{ width: 28, height: 28, borderRadius: '50%', background: 'var(--pink)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700, color: '#fff', marginRight: 6, flexShrink: 0, alignSelf: 'flex-end' }}>
                    {msg.from}
                  </div>
                )}

                <div style={{ maxWidth: '72%' }}>
                  {/* Bubble */}
                  <div
                    style={{
                      padding: '9px 13px',
                      background: isMe ? 'var(--pink)' : 'var(--card2)',
                      color: isMe ? '#fff' : 'var(--text)',
                      borderRadius: isMe ? '18px 18px 4px 18px' : '18px 18px 18px 4px',
                      fontSize: 14, lineHeight: 1.5, wordBreak: 'break-word',
                      border: isMe ? 'none' : '0.5px solid var(--border)',
                      cursor: 'pointer', userSelect: 'none',
                    }}
                    onClick={() => {
                      // My messages: tap = delete confirm
                      // Partner messages: tap = reaction picker
                      if (reacting === msg.id) { setReacting(null); return }
                      if (confirmDel === msg.id) { setConfirmDel(null); return }
                      if (isMe) setConfirmDel(msg.id)
                      else setReacting(reacting === msg.id ? null : msg.id)
                    }}
                  >
                    {msg.text}
                  </div>

                  {/* Reaction bubble */}
                  {msg.reaction && (
                    <div style={{ marginTop: 3, display: 'flex', justifyContent: isMe ? 'flex-end' : 'flex-start' }}>
                      <span style={{ fontSize: 16, background: 'var(--card)', border: '0.5px solid var(--border)', borderRadius: 12, padding: '2px 6px' }}>
                        {msg.reaction}
                      </span>
                    </div>
                  )}

                  {/* Timestamp */}
                  <div style={{ fontSize: 10, color: 'var(--muted)', marginTop: 3, textAlign: isMe ? 'right' : 'left' }}>
                    {formatTime(msg.createdAt)}
                  </div>

                  {/* Reaction picker (partner messages) */}
                  {reacting === msg.id && (
                    <div style={{
                      display: 'flex', gap: 4, background: 'var(--card)',
                      border: '0.5px solid var(--border)', borderRadius: 20, padding: '6px 10px',
                      position: 'absolute', left: 34, bottom: 32, zIndex: 10,
                      boxShadow: '0 4px 12px rgba(0,0,0,.3)',
                    }}>
                      {REACTIONS.map(emoji => (
                        <button key={emoji} onClick={() => handleReact(msg.id, emoji)}
                          style={{ background: 'none', border: 'none', fontSize: 22, cursor: 'pointer', padding: '2px 3px' }}>
                          {emoji}
                        </button>
                      ))}
                    </div>
                  )}

                  {/* Delete confirm (own messages only) */}
                  {confirmDel === msg.id && isMe && (
                    <div style={{ display: 'flex', gap: 6, marginTop: 4, justifyContent: 'flex-end' }}>
                      <button onClick={() => setConfirmDel(null)}
                        style={{ fontSize: 11, padding: '3px 8px', background: 'none', border: '0.5px solid var(--border)', borderRadius: 6, color: 'var(--muted)', cursor: 'pointer' }}>
                        Cancel
                      </button>
                      <button onClick={() => handleDelete(msg.id)}
                        style={{ fontSize: 11, padding: '3px 8px', background: '#a32d2d', border: 'none', borderRadius: 6, color: '#fff', cursor: 'pointer' }}>
                        Delete
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )
        })}
        <div ref={bottomRef} />
      </div>

      {/* Input bar */}
      <div style={{ padding: '10px 12px', borderTop: '0.5px solid var(--border)', background: 'var(--card)', display: 'flex', gap: 8, flexShrink: 0 }}>
        <input
          ref={inputRef}
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && !e.shiftKey && handleSend()}
          placeholder="Type something sweet..."
          style={{
            flex: 1, background: 'var(--card2)', border: '0.5px solid var(--border)',
            borderRadius: 20, color: 'var(--text)', padding: '10px 14px', fontSize: 14, outline: 'none',
          }}
        />
        <button
          onClick={handleSend}
          disabled={!input.trim() || sending}
          style={{
            width: 42, height: 42, borderRadius: '50%', flexShrink: 0,
            background: input.trim() && !sending ? 'var(--pink)' : 'var(--card2)',
            border: 'none',
            color: input.trim() && !sending ? '#fff' : 'var(--muted)',
            cursor: input.trim() && !sending ? 'pointer' : 'default',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 18, transition: 'background .2s',
          }}>
          <i className="ti ti-send" />
        </button>
      </div>
    </div>
  )
}
