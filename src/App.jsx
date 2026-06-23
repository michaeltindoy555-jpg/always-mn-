import { useState, useEffect } from 'react'
import { subscribeShared, subscribeJournal, subscribeLetters, subscribeBucket, subscribeMemories } from './firebase/firestore'
import HomeTab from './components/HomeTab'
import JournalTab from './components/JournalTab'
import MoodTab from './components/MoodTab'
import LettersTab from './components/LettersTab'
import BucketTab from './components/BucketTab'
import QodTab from './components/QodTab'
import QuizTab from './components/QuizTab'
import VoiceTab from './components/VoiceTab'
import DailyPromiseTab from './components/DailyPromiseTab'
import MemoryAlbumTab from './components/MemoryAlbumTab'

const TABS = [
  { id: 'home',    icon: 'ti-home',            label: 'Home' },
  { id: 'journal', icon: 'ti-notebook',         label: 'Journal' },
  { id: 'mood',    icon: 'ti-mood-smile',       label: 'Mood' },
  { id: 'letters', icon: 'ti-mail',             label: 'Letters' },
  { id: 'bucket',  icon: 'ti-target',           label: 'Bucket' },
  { id: 'promise', icon: 'ti-heart-handshake',  label: 'Promise' },
  { id: 'qod',     icon: 'ti-help-circle',      label: 'Q of Day' },
  { id: 'quiz',    icon: 'ti-brain',            label: 'Quiz' },
  { id: 'voice',   icon: 'ti-microphone',       label: 'Voice' },
  { id: 'memories',icon: 'ti-photo',            label: 'Album' },
]

export default function App() {
  const [currentUser, setCurrentUser] = useState('M')
  const [activeTab, setActiveTab] = useState('home')
  const [shared, setShared] = useState({})
  const [journal, setJournal] = useState([])
  const [letters, setLetters] = useState([])
  const [bucket, setBucket] = useState([])
  const [memories, setMemories] = useState([])

  useEffect(() => {
    const unsubs = [
      subscribeShared(setShared),
      subscribeJournal(setJournal),
      subscribeLetters(setLetters),
      subscribeBucket(setBucket),
      subscribeMemories(setMemories),
    ]
    return () => unsubs.forEach(u => u())
  }, [])

  // Ping badge: show dot on Home tab if there's an unread ping for currentUser
  const hasPing = shared.ping?.to === currentUser && shared.ping?.unread === true

  const handleTabClick = (id) => setActiveTab(id)
  const switchUser = (u) => setCurrentUser(u)

  // Background photo from shared Firestore doc
  const bgPhoto = shared.bgPhoto || null

  return (
    <div style={{
      minHeight: '100vh',
      maxWidth: 480,
      margin: '0 auto',
      display: 'flex',
      flexDirection: 'column',
      position: 'relative',
      ...(bgPhoto ? {
        backgroundImage: `url(${bgPhoto})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundAttachment: 'fixed',
      } : {})
    }}>
      {/* Dark overlay when bg photo is set */}
      {bgPhoto && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(8, 4, 12, 0.72)',
          zIndex: 0,
          maxWidth: 480,
          margin: '0 auto',
          left: 0, right: 0,
        }} />
      )}

      {/* All content above overlay */}
      <div style={{ position: 'relative', zIndex: 1, display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>

        {/* Header */}
        <div style={{
          background: bgPhoto ? 'rgba(26, 14, 24, 0.85)' : 'var(--pink-light)',
          color: bgPhoto ? '#f4c0d1' : '#4b1528',
          padding: 16,
          textAlign: 'center',
          borderBottom: '0.5px solid var(--pink-mid)',
          backdropFilter: bgPhoto ? 'blur(8px)' : 'none',
        }}>
          <h1 style={{ fontSize: 20, fontWeight: 600, letterSpacing: 2, color: bgPhoto ? '#f4c0d1' : '#4b1528' }}>ALWAYS MN</h1>
          <p style={{ fontSize: 12, color: bgPhoto ? '#d4537e' : '#72243e', marginTop: 2 }}>always &amp; forever</p>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12, marginTop: 10 }}>
            {['M', 'N'].map((u, i) => (
              <>
                {i === 1 && <span key="sep" style={{ color: '#d4537e', fontSize: 16 }}>♥</span>}
                <div key={u} onClick={() => switchUser(u)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 6,
                    background: currentUser === u ? '#d4537e' : (bgPhoto ? 'rgba(212,83,126,0.2)' : '#f4c0d1'),
                    borderRadius: 20, padding: '4px 12px', cursor: 'pointer',
                    border: `1.5px solid ${currentUser === u ? '#d4537e' : '#ed93b1'}`,
                    color: currentUser === u ? '#fff' : (bgPhoto ? '#f4c0d1' : '#4b1528'),
                  }}>
                  <div style={{
                    width: 22, height: 22, borderRadius: '50%',
                    background: currentUser === u ? '#fff' : '#d4537e',
                    color: currentUser === u ? '#d4537e' : '#fff',
                    fontSize: 11, fontWeight: 600, display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>{u}</div>
                  <span style={{ fontSize: 13, fontWeight: 500 }}>{u} {u === 'M' ? '(You)' : '(Her)'}</span>
                </div>
              </>
            ))}
          </div>
        </div>

        <div style={{
          textAlign: 'center', fontSize: 11, color: 'var(--muted)', padding: 6,
          background: bgPhoto ? 'rgba(18, 10, 20, 0.7)' : 'var(--card)',
          backdropFilter: bgPhoto ? 'blur(4px)' : 'none',
        }}>
          Viewing as {currentUser} — tap a name to switch
        </div>

        {/* Nav */}
        <nav style={{
          display: 'flex',
          background: bgPhoto ? 'rgba(18, 10, 20, 0.85)' : 'var(--card)',
          borderTop: '0.5px solid var(--border)',
          overflowX: 'auto',
          padding: '4px 0',
          backdropFilter: bgPhoto ? 'blur(8px)' : 'none',
        }}>
          {TABS.map(t => (
            <button key={t.id} onClick={() => handleTabClick(t.id)}
              style={{
                flex: 1, minWidth: 56, background: 'none', border: 'none',
                color: activeTab === t.id ? 'var(--pink)' : 'var(--muted)',
                padding: '8px 4px', cursor: 'pointer', fontSize: 10,
                display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3, whiteSpace: 'nowrap',
                position: 'relative',
              }}>
              <span style={{ position: 'relative', display: 'inline-flex' }}>
                <i className={`ti ${t.icon}`} style={{ fontSize: 20 }} />
                {t.id === 'home' && hasPing && (
                  <span style={{
                    position: 'absolute', top: -3, right: -5,
                    width: 8, height: 8, borderRadius: '50%',
                    background: 'var(--pink)', border: '1.5px solid var(--card)',
                  }} />
                )}
              </span>
              {t.label}
            </button>
          ))}
        </nav>

        {/* Pages */}
        {activeTab === 'home'     && <HomeTab currentUser={currentUser} shared={shared} setShared={setShared} hasPing={hasPing} />}
        {activeTab === 'journal'  && <JournalTab currentUser={currentUser} journal={journal} />}
        {activeTab === 'mood'     && <MoodTab currentUser={currentUser} shared={shared} />}
        {activeTab === 'letters'  && <LettersTab currentUser={currentUser} letters={letters} />}
        {activeTab === 'bucket'   && <BucketTab bucket={bucket} />}
        {activeTab === 'qod'      && <QodTab />}
        {activeTab === 'quiz'     && <QuizTab />}
        {activeTab === 'promise'  && <DailyPromiseTab currentUser={currentUser} shared={shared} />}
        {activeTab === 'voice'    && <VoiceTab currentUser={currentUser} />}
        {activeTab === 'memories' && <MemoryAlbumTab currentUser={currentUser} memories={memories} />}

        <style>{`
          .card {
            background: ${bgPhoto ? 'rgba(22, 12, 22, 0.82)' : 'var(--card)'};
            border: 0.5px solid var(--border);
            border-radius: 12px;
            padding: 14px;
            margin-bottom: 12px;
            ${bgPhoto ? 'backdrop-filter: blur(6px);' : ''}
          }
          .card-title {
            font-size: 13px;
            font-weight: 500;
            color: var(--muted);
            margin-bottom: 8px;
            text-transform: uppercase;
            letter-spacing: 1px;
          }
        `}</style>
      </div>
    </div>
  )
}
