import { useState, useRef, useEffect } from 'react'
import { addVoiceMessage, subscribeVoiceMessages, markVoicePlayed } from '../firebase/firestore'

const CLOUDINARY_CLOUD_NAME = 'dkzipz4kv'
const CLOUDINARY_UPLOAD_PRESET = 'qmnyuxmx'

async function uploadAudioToCloudinary(blob) {
  const fd = new FormData()
  fd.append('file', blob, 'voice.webm')
  fd.append('upload_preset', CLOUDINARY_UPLOAD_PRESET)
  fd.append('resource_type', 'video') // Cloudinary uses 'video' for audio files
  const res = await fetch(`https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/video/upload`, {
    method: 'POST',
    body: fd
  })
  if (!res.ok) throw new Error('Upload failed')
  const data = await res.json()
  return data.secure_url
}

export default function VoiceTab({ currentUser }) {
  const [recording, setRecording] = useState(false)
  const [secs, setSecs] = useState(0)
  const [uploading, setUploading] = useState(false)
  const [messages, setMessages] = useState([])
  const [playingId, setPlayingId] = useState(null)
  const mediaRecorderRef = useRef(null)
  const chunksRef = useRef([])
  const timerRef = useRef(null)
  const secsRef = useRef(0)
  const audioRef = useRef(null)
  const partner = currentUser === 'M' ? 'N' : 'M'

  useEffect(() => {
    const unsub = subscribeVoiceMessages((msgs) => {
      // Filter: only show messages TO currentUser, not expired (within 24h)
      const now = Date.now()
      const valid = msgs.filter(m =>
        m.to === currentUser &&
        m.expiresAt > now &&
        !m.played
      )
      setMessages(valid)
    })
    return () => unsub()
  }, [currentUser])

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
      setSecs(0)
      timerRef.current = setInterval(() => {
        secsRef.current++
        setSecs(secsRef.current)
        // Max 60 seconds
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
      setSecs(0)
      return
    }

    mediaRecorderRef.current.onstop = async () => {
      const blob = new Blob(chunksRef.current, { type: 'audio/webm' })
      mediaRecorderRef.current.stream.getTracks().forEach(t => t.stop())
      setUploading(true)
      try {
        const url = await uploadAudioToCloudinary(blob)
        await addVoiceMessage({
          from: currentUser,
          to: partner,
          url,
          dur,
          played: false,
          sentAt: Date.now(),
          expiresAt: Date.now() + 24 * 60 * 60 * 1000, // 24 hours from now
        })
      } catch {
        alert('Failed to send voice message. Try again!')
      }
      setUploading(false)
    }

    mediaRecorderRef.current.stop()
    setSecs(0)
  }

  const playMessage = async (msg) => {
    if (playingId) return
    setPlayingId(msg.id)
    const audio = new Audio(msg.url)
    audioRef.current = audio
    audio.play()
    audio.onended = async () => {
      setPlayingId(null)
      // Mark as played — hides it from inbox
      await markVoicePlayed(msg.id)
    }
    audio.onerror = () => {
      setPlayingId(null)
      alert('Could not play this message.')
    }
  }

  const formatTime = (s) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`

  const formatExpiry = (expiresAt) => {
    const remaining = expiresAt - Date.now()
    const hrs = Math.floor(remaining / 3600000)
    const mins = Math.floor((remaining % 3600000) / 60000)
    if (hrs > 0) return `expires in ${hrs}h ${mins}m`
    return `expires in ${mins}m`
  }

  return (
    <div style={{ flex: 1, padding: 16, overflowY: 'auto' }}>
      {/* Recorder */}
      <div className="card" style={{ textAlign: 'center', padding: 24 }}>
        <div style={{ fontSize: 12, fontWeight: 500, textTransform: 'uppercase', letterSpacing: 1, color: 'var(--muted)', marginBottom: 6 }}>WALKIE-TALKIE</div>
        <p style={{ color: 'var(--muted)', fontSize: 13, marginBottom: 20 }}>
          {recording ? 'Release to send' : uploading ? 'Sending...' : `Hold to record for ${partner}`}
        </p>

        {/* Big record button */}
        <button
          onMouseDown={startRec}
          onMouseUp={stopRec}
          onTouchStart={(e) => { e.preventDefault(); startRec() }}
          onTouchEnd={(e) => { e.preventDefault(); stopRec() }}
          disabled={uploading}
          style={{
            width: 90, height: 90, borderRadius: '50%',
            background: recording ? 'var(--pink)' : uploading ? 'var(--card2)' : 'var(--card2)',
            border: `3px solid ${recording ? 'var(--pink)' : 'var(--border)'}`,
            color: recording ? '#fff' : uploading ? 'var(--muted)' : 'var(--muted)',
            cursor: uploading ? 'default' : 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            margin: '0 auto',
            fontSize: 36,
            boxShadow: recording ? '0 0 0 8px rgba(212,83,126,0.2)' : 'none',
            transition: 'all .2s',
          }}>
          {uploading
            ? <i className="ti ti-loader" style={{ animation: 'spin 1s linear infinite' }} />
            : <i className="ti ti-microphone" />
          }
        </button>

        {/* Timer */}
        <div style={{ marginTop: 14, fontSize: 13, color: recording ? 'var(--pink)' : 'var(--muted)', fontWeight: recording ? 600 : 400 }}>
          {recording ? `● REC ${formatTime(secs)} / 1:00` : uploading ? 'Uploading voice message...' : 'Hold the button to record'}
        </div>
      </div>

      {/* Inbox */}
      <div style={{ fontSize: 12, fontWeight: 500, textTransform: 'uppercase', letterSpacing: 1, color: 'var(--muted)', margin: '4px 0 10px' }}>
        INBOX {messages.length > 0 && <span style={{ background: 'var(--pink)', color: '#fff', borderRadius: 10, padding: '1px 7px', fontSize: 10, marginLeft: 6 }}>{messages.length}</span>}
      </div>

      {messages.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: 20 }}>
          <div style={{ fontSize: 28, marginBottom: 6 }}>🎙️</div>
          <p style={{ color: 'var(--muted)', fontSize: 13 }}>No voice messages yet.</p>
          <p style={{ color: 'var(--muted)', fontSize: 12, marginTop: 4 }}>Messages disappear after being played or after 24 hours.</p>
        </div>
      ) : (
        messages.map(msg => (
          <div key={msg.id} style={{
            background: 'var(--card)', border: '0.5px solid var(--pink)',
            borderRadius: 12, padding: 14, marginBottom: 10,
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          }}>
            <div>
              <div style={{ fontSize: 13, color: 'var(--pink)', fontWeight: 500, marginBottom: 3 }}>
                🎙️ from {msg.from}
              </div>
              <div style={{ fontSize: 11, color: 'var(--muted)' }}>
                {formatTime(msg.dur)} · {formatExpiry(msg.expiresAt)}
              </div>
            </div>

            {playingId === msg.id ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'var(--pink)', fontSize: 13 }}>
                <i className="ti ti-volume" style={{ fontSize: 18 }} />
                Playing...
              </div>
            ) : (
              <button
                onClick={() => playMessage(msg)}
                style={{
                  padding: '8px 18px', background: 'var(--pink)', color: '#fff',
                  border: 'none', borderRadius: 8, cursor: 'pointer', fontSize: 13, fontWeight: 500,
                  display: 'flex', alignItems: 'center', gap: 6,
                }}>
                <i className="ti ti-player-play" /> Play once
              </button>
            )}
          </div>
        ))
      )}

      <p style={{ fontSize: 11, color: 'var(--muted)', textAlign: 'center', marginTop: 8 }}>
        Voice messages disappear after being played or after 24 hours 🕐
      </p>
    </div>
  )
}
