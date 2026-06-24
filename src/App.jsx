import { useState, useEffect } from 'react'
import { subscribeShared, subscribeJournal, subscribeLetters, subscribeBucket, subscribeMemories, subscribePlaylist } from './firebase/firestore'
import { registerFCMToken, onForegroundMessage } from './firebase/fcm'
import HomeTab from './components/HomeTab'
import ChatTab from './components/ChatTab'
import JournalTab from './components/JournalTab'
import MoodTab from './components/MoodTab'
import LettersTab from './components/LettersTab'
import BucketTab from './components/BucketTab'
import MemoryAlbumTab from './components/MemoryAlbumTab'
import QuizTab from './components/QuizTab'
import PlaylistTab from './components/PlaylistTab'
import DailyPromiseTab from './components/DailyPromiseTab'
import VoiceTab from './components/VoiceTab'
import QodTab from './components/QodTab'

const TABS = [
  { id: 'home',     icon: 'ti-home',       label: 'Home' },
  { id: 'chat',     icon: 'ti-message',    label: 'Chat' },
  { id: 'journal',  icon: 'ti-notebook',   label: 'Journal' },
  { id: 'mood',     icon: 'ti-mood-smile', label: 'Mood' },
  { id: 'letters',  icon: 'ti-mail',       label: 'Letters' },
  { id: 'bucket',   icon: 'ti-target',     label: 'Bucket' },
  { id: 'memories', icon: 'ti-photo',      label: 'Album' },
  { id: 'playlist', icon: 'ti-music',      label: 'Playlist' },
  { id: 'quiz',     icon: 'ti-cards',      label: 'Games' },
  { id: 'voice',    icon: 'ti-microphone', label: 'Voice' },
  { id: 'promise',  icon: 'ti-heart-handshake', label: 'Promise' },
  { id: 'qod',      icon: 'ti-question-mark', label: 'Q&A' },
]

// ── Theme definitions ────────────────────────────────────────────────────────
const THEMES = {
  dark: {
    label: '🌙 Dark',
    vars: {
      '--bg':         '#0a0612',
      '--card':       'rgba(22,12,28,0.85)',
      '--card2':      'rgba(255,255,255,0.04)',
      '--border':     'rgba(212,83,126,0.15)',
      '--text':       '#f0e6ee',
      '--muted':      'rgba(180,140,160,0.6)',
      '--pink':       '#d4537e',
      '--pink-light': 'rgba(212,83,126,0.12)',
    }
  },
  candle: {
    label: '🕯️ Candlelight',
    vars: {
      '--bg':         '#1a0f08',
      '--card':       'rgba(40,22,10,0.92)',
      '--card2':      'rgba(255,180,80,0.05)',
      '--border':     'rgba(220,140,60,0.2)',
      '--text':       '#f5e6d0',
      '--muted':      'rgba(200,160,100,0.65)',
      '--pink':       '#e07840',
      '--pink-light': 'rgba(220,120,60,0.12)',
    }
  },
}

function applyTheme(themeKey) {
  const theme = THEMES[themeKey]
  if (!theme) return
  const root = document.documentElement
  Object.entries(theme.vars).forEach(([k, v]) => root.style.setProperty(k, v))
}

export default function App() {
  const [currentUser, setCurrentUser] = useState('M')
  const [activeTab, setActiveTab]     = useState('home')
  const [shared, setShared]           = useState({})
  const [journal, setJournal]         = useState([])
  const [letters, setLetters]         = useState([])
  const [bucket, setBucket]           = useState([])
  const [memories, setMemories]       = useState([])
  const [playlist, setPlaylist]       = useState([])
  const [toast, setToast]             = useState(null)
  const [theme, setTheme]             = useState(() => localStorage.getItem('mn-theme') || 'dark')

  useEffect(() => {
    applyTheme(theme)
    localStorage.setItem('mn-theme', theme)
  }, [theme])

  const toggleTheme = () => {
    setTheme(t => t === 'dark' ? 'candle' : 'dark')
  }

  useEffect(() => {
    const unsubs = [
      subscribeShared(setShared),
      subscribeJournal(setJournal),
      subscribeLetters(setLetters),
      subscribeBucket(setBucket),
      subscribeMemories(setMemories),
      subscribePlaylist(setPlaylist),
    ]
    return () => unsubs.forEach(u => u())
  }, [])

  useEffect(() => { registerFCMToken(currentUser) }, [currentUser])

  useEffect(() => {
    const unsub = onForegroundMessage((payload) => {
      const msg = payload.notification?.body || payload.notification?.title || '💗 New notification'
      setToast(msg)
      setTimeout(() => setToast(null), 4000)
    })
    return () => unsub()
  }, [])

  const hasPing = shared.ping?.to === currentUser && shared.ping?.unread === true

  return (
    <div style={{ minHeight: '100vh', maxWidth: 480, margin: '0 auto', display: 'flex', flexDirection: 'column', background: 'var(--bg)' }}>

      {/* Foreground toast */}
      {toast && (
        <div style={{
          position: 'fixed', top: 16, left: '50%', transform: 'translateX(-50%)',
          background: 'linear-gradient(135deg, #d4537e, #a03060)',
          color: '#fff', borderRadius: 20, padding: '10px 18px', fontSize: 13, fontWeight: 500,
          zIndex: 999, boxShadow: '0 4px 20px rgba(212,83,126,0.4)', maxWidth: 340, textAlign: 'center',
          animation: 'fadeIn .2s ease',
        }}>
          {toast}
        </div>
      )}

      {/* Header */}
      <div style={{
        background: theme === 'candle'
          ? 'linear-gradient(135deg, #1a0a04 0%, #120b06 100%)'
          : 'linear-gradient(135deg, #1a0620 0%, #0f0a1a 100%)',
        padding: '14px 16px 12px',
        borderBottom: '0.5px solid var(--border)',
        position: 'sticky', top: 0, zIndex: 50,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          {/* Logo */}
          <div>
            <div style={{ fontSize: 17, fontWeight: 700, letterSpacing: 3, color: theme === 'candle' ? '#f5d8b0' : '#f4c0d1' }}>ALWAYS MN</div>
            <div style={{ fontSize: 10, color: 'var(--muted)', letterSpacing: 1 }}>always &amp; forever</div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            {/* Theme toggle */}
            <button onClick={toggleTheme}
              title={theme === 'dark' ? 'Switch to Candlelight' : 'Switch to Dark'}
              style={{
                width: 34, height: 34, borderRadius: '50%',
                background: 'rgba(255,255,255,0.06)',
                border: '0.5px solid var(--border)',
                color: 'var(--muted)', cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 16, transition: 'all .2s',
              }}>
              {theme === 'dark' ? '🕯️' : '🌙'}
            </button>

            {/* User switcher */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 4, background: 'rgba(255,255,255,0.04)', border: '0.5px solid var(--border)', borderRadius: 24, padding: '4px 8px' }}>
              {['M', 'N'].map((u, i) => (
                <div key={u} style={{ display: 'flex', alignItems: 'center' }}>
                  {i === 1 && <span style={{ color: 'var(--muted)', fontSize: 12, margin: '0 2px' }}>♥</span>}
                  <button onClick={() => setCurrentUser(u)} style={{
                    width: 32, height: 32, borderRadius: '50%',
                    background: currentUser === u
                      ? 'linear-gradient(135deg, var(--pink), #a03060)'
                      : 'rgba(255,255,255,0.06)',
                    border: currentUser === u ? 'none' : '0.5px solid var(--border)',
                    color: currentUser === u ? '#fff' : 'var(--muted)',
                    fontSize: 13, fontWeight: 700, cursor: 'pointer',
                    boxShadow: currentUser === u ? '0 2px 10px rgba(212,83,126,0.4)' : 'none',
                    transition: 'all .2s',
                  }}>
                    {u}
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
        <div style={{ fontSize: 10, color: 'var(--muted)', marginTop: 6, textAlign: 'center', letterSpacing: 0.5 }}>
          Viewing as {currentUser} — tap a letter to switch
        </div>
      </div>

      {/* Nav */}
      <nav style={{
        display: 'flex',
        background: theme === 'candle' ? 'rgba(20,10,4,0.97)' : 'rgba(15,8,22,0.97)',
        borderBottom: '0.5px solid var(--border)',
        overflowX: 'scroll', overflowY: 'hidden', flexWrap: 'nowrap',
        padding: '6px', gap: 4,
        position: 'sticky', top: 74, zIndex: 40,
        backdropFilter: 'blur(10px)',
        WebkitOverflowScrolling: 'touch',
        scrollbarWidth: 'none', msOverflowStyle: 'none',
      }}>
        {TABS.map(t => {
          const isActive = activeTab === t.id
          return (
            <button key={t.id} onClick={() => setActiveTab(t.id)}
              style={{
                flex: '0 0 52px', height: 52,
                background: isActive
                  ? 'linear-gradient(135deg, rgba(var(--pink-rgb,212,83,126),0.28) 0%, rgba(140,48,96,0.22) 100%)'
                  : 'rgba(255,255,255,0.04)',
                border: isActive ? `1px solid var(--pink)` : '1px solid rgba(255,255,255,0.08)',
                borderRadius: 13,
                color: isActive ? 'var(--text)' : 'var(--muted)',
                cursor: 'pointer', fontSize: 9, fontWeight: isActive ? 600 : 400,
                display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 4,
                whiteSpace: 'nowrap', position: 'relative', transition: 'all .18s',
                boxShadow: isActive ? '0 2px 14px rgba(212,83,126,0.22)' : 'none',
                opacity: isActive ? 1 : 0.7,
              }}>
              <span style={{ position: 'relative', display: 'inline-flex' }}>
                <i className={`ti ${t.icon}`} style={{ fontSize: 18 }} />
                {t.id === 'home' && hasPing && (
                  <span style={{ position: 'absolute', top: -3, right: -5, width: 7, height: 7, borderRadius: '50%', background: 'var(--pink)', border: '1.5px solid var(--bg)' }} />
                )}
              </span>
              {t.label}
            </button>
          )
        })}
      </nav>

      {/* Pages */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
        {activeTab === 'home'     && <HomeTab currentUser={currentUser} shared={shared} hasPing={hasPing} />}
        {activeTab === 'chat'     && <ChatTab currentUser={currentUser} />}
        {activeTab === 'journal'  && <JournalTab currentUser={currentUser} journal={journal} />}
        {activeTab === 'mood'     && <MoodTab currentUser={currentUser} shared={shared} />}
        {activeTab === 'letters'  && <LettersTab currentUser={currentUser} letters={letters} />}
        {activeTab === 'bucket'   && <BucketTab bucket={bucket} />}
        {activeTab === 'memories' && <MemoryAlbumTab currentUser={currentUser} memories={memories} />}
        {activeTab === 'playlist' && <PlaylistTab currentUser={currentUser} playlist={playlist} />}
        {activeTab === 'quiz'     && <QuizTab />}
        {activeTab === 'voice'    && <VoiceTab currentUser={currentUser} />}
        {activeTab === 'promise'  && <DailyPromiseTab currentUser={currentUser} shared={shared} />}
        {activeTab === 'qod'      && <QodTab />}
      </div>

      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateX(-50%) translateY(-8px); }
          to   { opacity: 1; transform: translateX(-50%) translateY(0); }
        }
        nav::-webkit-scrollbar { display: none; }
        .card {
          background: var(--card);
          border: 0.5px solid var(--border);
          border-radius: 14px;
          padding: 14px;
          margin-bottom: 12px;
          backdrop-filter: blur(4px);
        }
        .card-title {
          font-size: 11px;
          font-weight: 600;
          color: var(--muted);
          margin-bottom: 10px;
          text-transform: uppercase;
          letter-spacing: 1.5px;
        }
      `}</style>
    </div>
  )
}
