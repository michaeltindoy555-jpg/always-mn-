import { useState, useEffect, useRef } from 'react'
import { subscribeChat, addChatMessage, deleteChatMessage, updateChatMessage } from '../firebase/firestore'
import { getPartnerToken, sendPushNotification } from '../firebase/fcm'

const REACTIONS = ['❤️', '😂', '🥺', '😍', '💯']

const CLOUDINARY_CLOUD_NAME = 'dkzipz4kv'
const CLOUDINARY_UPLOAD_PRESET = 'qmnyuxmx'

async function uploadAudioToCloudinary(blob) {
  const fd = new FormData()
  fd.append('file', blob, 'voice.webm')
  fd.append('upload_preset', CLOUDINARY_UPLOAD_PRESET)
  // Try 'video' resource type (Cloudinary handles audio under video)
  const res = await fetch(
    `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/video/upload`,
    { method: 'POST', body: fd }
  )
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err.error?.message || `Upload failed (${res.status})`)
  }
  const data = await res.json()
  return data.secure_url
}

function expiryLabel(expiresAt) {
  if (!expiresAt) return null
  const ms = expiresAt - Date.now()
  if (ms <= 0) return null
  const days = Math.floor(ms / 86400000)
  if (days >= 2) return `Deletes in ${days}d`
  const hrs = Math.floor(ms / 3600000)
  if (hrs >= 1) return `Deletes in ${hrs}h`
  return 'Deletes soon'
}

export default function ChatTab({ currentUser }) {
  const [messages, setMessages]     = useState([])
  const [input, setInput]           = useState('')
  const [sending, setSending]       = useState(false)
  const [reacting, setReacting]     = useState(null)
  const [confirmDel, setConfirmDel] = useState(null)
  const [recording, setRecording]   = useState(false)
  const [recSecs, setRecSecs]       = useState(0)
  const [uploading, setUploading]   = useState(false)
  const [playingId, setPlayingId]   = useState(null)
  const bottomRef        = useRef()
  const inputRef         = useRef()
  const mediaRecorderRef = useRef(null)
  const chunksRef        = useRef([])
  const timerRef         = useRef(null)
  const secsRef          = useRef(0)
  const partner = currentUser === 'M' ? 'N' : 'M'

  useEffect(() => {
    const unsub = subscribeChat(setMessages)
    return () => unsub()
  }, [])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // ── Send text ──────────────────────────────────────────────────────────────
  const handleSend = async () => {
    const text = input.trim()
    if (!text || sending) return
    setSending(true)
    setInput('')
    try {
      await addChatMessage({ from: currentUser, text, type: 'text', reaction: null })
      const token = await getPartnerToken(partner)
      await sendPushNotification({
        toToken: token,
        title: `💬 ${currentUser} sent a message`,
        body: text.length > 60 ? text.slice(0, 60) + '…' : text,
      })
    } catch (err) {
      console.error('Chat send error:', err)
      setInput(text)
    }
    setSending(false)
    inputRef.current?.focus()
  }

  const handleReact = async (msgId, emoji) => {
    await updateChatMessage(msgId, { reaction: emoji })
    setReacting(null)
  }

  const handleDelete = async (msgId) => {
    await deleteChatMessage(msgId)
    setConfirmDel(null)
  }

  // ── Voice recording ────────────────────────────────────────────────────────
  const startRec = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const mediaRecorder = new MediaRecorder(stream)
      mediaRecorderRef.current = mediaRecorder
      chunksRef.current = []
      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data)
      }
      mediaRecorder.start()
      setRecording(true)
      secsRef.current = 0
      setRecSecs(0)
      timerRef.current = setInterval(() => {
        secsRef.current++
        setRecSecs(secsRef.current)
        if (secsRef.current >= 60) stopRec()
      }, 1000)
    } catch {
      alert('Microphone access denied. Please allow microphone in your browser settings.')
    }
  }

  const stopRec = async () => {
    if (!mediaRecorderRef.current || !recording) return
    clearInterval(timerRef.current)
    setRecording(false)
    const dur = secsRef.current
    if (dur < 1) {
      mediaRecorderRef.current.stream.getTracks().forEach(t => t.stop())
      setRecSecs(0)
      return
    }
    mediaRecorderRef.current.onstop = async () => {
      const blob = new Blob(chunksRef.current, { type: 'audio/webm' })
      mediaRecorderRef.current.stream.getTracks().forEach(t => t.stop())
      setUploading(true)
      try {
        const url = await uploadAudioToCloudinary(blob)
        await addChatMessage({ from: currentUser, type: 'voice', url, dur, reaction: null })
        const token = await getPartnerToken(partner)
        await sendPushNotification({
          toToken: token,
          title: `🎙️ ${currentUser} sent a voice message`,
          body: `${Math.floor(dur / 60)}:${String(dur % 60).padStart(2, '0')} voice message`,
        })
      } catch (err) {
        console.error('Voice upload error:', err)
        alert('Failed to send voice message: ' + err.message)
      }
      setUploading(false)
    }
    mediaRecorderRef.current.stop()
    setRecSecs(0)
  }

  const playVoice = (msg) => {
    if (playingId) return
    setPlayingId(msg.id)
    const audio = new Audio(msg.url)
    audio.play().catch(e => { setPlayingId(null); alert('Could not play: ' + e.message) })
    audio.onended = () => setPlayingId(null)
    audio.onerror = () => { setPlayingId(null) }
  }

  const fmtTime = (s) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`

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

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>

      {/* Header */}
      <div style={{ padding: '12px 16px 8px', borderBottom: '0.5px solid var(--border)', background: 'var(--card)', flexShrink: 0 }}>
        <div style={{ fontSize: 15, fontWeight: 600 }}>💬 M & N</div>
        <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 1 }}>Real-time chat · messages auto-delete after 30 days</div>
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
          const expiry      = expiryLabel(msg.expiresAt)
          const nearExpiry  = msg.expiresAt && (msg.expiresAt - Date.now()) < 3 * 24 * 60 * 60 * 1000 // <3 days

          return (
            <div key={msg.id}>
              {showDivider && (
                <div style={{ textAlign: 'center', margin: '14px 0 10px' }}>
                  <span style={{ fontSize: 11, color: 'var(--muted)', background: 'var(--card2)', padding: '3px 10px', borderRadius: 10 }}>
                    {thisDate}
                  </span>
                </div>
              )}

              <div style={{ display: 'flex', justifyContent: isMe ? 'flex-end' : 'flex-start', marginBottom: 6, position: 'relative' }}>
                {!isMe && (
                  <div style={{ width: 28, height: 28, borderRadius: '50%', background: 'var(--pink)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700, color: '#fff', marginRight: 6, flexShrink: 0, alignSelf: 'flex-end' }}>
                    {msg.from}
                  </div>
                )}

                <div style={{ maxWidth: '72%' }}>
                  {/* Voice bubble */}
                  {msg.type === 'voice' ? (
                    <div style={{
                      padding: '10px 14px',
                      background: isMe ? 'var(--pink)' : 'var(--card2)',
                      borderRadius: isMe ? '18px 18px 4px 18px' : '18px 18px 18px 4px',
                      border: isMe ? 'none' : '0.5px solid var(--border)',
                      display: 'flex', alignItems: 'center', gap: 10, minWidth: 140,
                    }}>
                      <button
                        onClick={() => playVoice(msg)}
                        disabled={!!playingId}
                        style={{
                          width: 32, height: 32, borderRadius: '50%', flexShrink: 0,
                          background: isMe ? 'rgba(255,255,255,0.25)' : 'var(--pink)',
                          border: 'none', color: '#fff', cursor: playingId ? 'default' : 'pointer',
                          display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14,
                        }}>
                        {playingId === msg.id
                          ? <i className="ti ti-volume" />
                          : <i className="ti ti-player-play" />
                        }
                      </button>
                      <div>
                        <div style={{ fontSize: 12, color: isMe ? 'rgba(255,255,255,0.9)' : 'var(--text)', fontWeight: 500 }}>
                          {playingId === msg.id ? 'Playing...' : '🎙️ Voice message'}
                        </div>
                        <div style={{ fontSize: 10, color: isMe ? 'rgba(255,255,255,0.6)' : 'var(--muted)' }}>
                          {fmtTime(msg.dur || 0)}
                        </div>
                      </div>
                    </div>
                  ) : (
                    /* Text bubble */
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
                        if (reacting === msg.id) { setReacting(null); return }
                        if (confirmDel === msg.id) { setConfirmDel(null); return }
                        if (isMe) setConfirmDel(msg.id)
                        else setReacting(reacting === msg.id ? null : msg.id)
                      }}
                    >
                      {msg.text}
                    </div>
                  )}

                  {/* Reaction bubble */}
                  {msg.reaction && (
                    <div style={{ marginTop: 3, display: 'flex', justifyContent: isMe ? 'flex-end' : 'flex-start' }}>
                      <span style={{ fontSize: 16, background: 'var(--card)', border: '0.5px solid var(--border)', borderRadius: 12, padding: '2px 6px' }}>
                        {msg.reaction}
                      </span>
                    </div>
                  )}

                  {/* Timestamp + expiry */}
                  <div style={{ fontSize: 10, color: 'var(--muted)', marginTop: 3, textAlign: isMe ? 'right' : 'left', display: 'flex', gap: 6, justifyContent: isMe ? 'flex-end' : 'flex-start', alignItems: 'center' }}>
                    <span>{formatTime(msg.createdAt)}</span>
                    {nearExpiry && expiry && (
                      <span style={{ color: '#e08a40', fontSize: 9 }}>· {expiry}</span>
                    )}
                  </div>

                  {/* Reaction picker */}
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

                  {/* Delete confirm */}
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

      {/* Recording indicator */}
      {recording && (
        <div style={{
          margin: '0 12px 6px', padding: '10px 14px',
          background: 'rgba(212,83,126,0.12)', border: '0.5px solid rgba(212,83,126,0.4)',
          borderRadius: 12, display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0,
        }}>
          <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#d4537e', display: 'inline-block', animation: 'recpulse 1s infinite' }} />
          <span style={{ fontSize: 13, color: 'var(--pink)', fontWeight: 500 }}>Recording {fmtTime(recSecs)} / 1:00</span>
          <span style={{ fontSize: 12, color: 'var(--muted)', marginLeft: 'auto' }}>Release to send</span>
        </div>
      )}

      {uploading && (
        <div style={{ margin: '0 12px 6px', padding: '8px 14px', background: 'var(--card2)', borderRadius: 12, fontSize: 13, color: 'var(--muted)', flexShrink: 0 }}>
          Sending voice message... ⏳
        </div>
      )}

      {/* Input bar */}
      <div style={{ padding: '10px 12px', borderTop: '0.5px solid var(--border)', background: 'var(--card)', display: 'flex', gap: 8, flexShrink: 0, alignItems: 'center' }}>
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

        {/* Hold-to-record mic button (shown when input is empty) */}
        {!input.trim() && (
          <button
            onMouseDown={startRec}
            onMouseUp={stopRec}
            onTouchStart={(e) => { e.preventDefault(); startRec() }}
            onTouchEnd={(e) => { e.preventDefault(); stopRec() }}
            disabled={uploading}
            style={{
              width: 42, height: 42, borderRadius: '50%', flexShrink: 0,
              background: recording ? 'var(--pink)' : 'var(--card2)',
              border: `1.5px solid ${recording ? 'var(--pink)' : 'var(--border)'}`,
              color: recording ? '#fff' : 'var(--muted)',
              cursor: uploading ? 'default' : 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 18,
              boxShadow: recording ? '0 0 0 6px rgba(212,83,126,0.2)' : 'none',
              transition: 'all .15s',
            }}>
            <i className={uploading ? 'ti ti-loader' : 'ti ti-microphone'}
               style={uploading ? { animation: 'spin 1s linear infinite' } : {}} />
          </button>
        )}

        {/* Send text button */}
        {input.trim() && (
          <button
            onClick={handleSend}
            disabled={sending}
            style={{
              width: 42, height: 42, borderRadius: '50%', flexShrink: 0,
              background: !sending ? 'var(--pink)' : 'var(--card2)',
              border: 'none',
              color: !sending ? '#fff' : 'var(--muted)',
              cursor: !sending ? 'pointer' : 'default',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 18, transition: 'background .2s',
            }}>
            <i className="ti ti-send" />
          </button>
        )}
      </div>

      <style>{`
        @keyframes recpulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.3; }
        }
      `}</style>
    </div>
  )
}
