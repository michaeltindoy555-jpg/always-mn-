import { useState, useEffect } from 'react'
import { subscribeShared, subscribeJournal, subscribeLetters, subscribeBucket } from './firebase/firestore'
import HomeTab from './components/HomeTab'
import JournalTab from './components/JournalTab'
import MoodTab from './components/MoodTab'
import LettersTab from './components/LettersTab'
import BucketTab from './components/BucketTab'
import QodTab from './components/QodTab'
import QuizTab from './components/QuizTab'
import VoiceTab from './components/VoiceTab'

const TABS = [
  { id: 'home',    icon: 'ti-home',         label: 'Home' },
  { id: 'journal', icon: 'ti-notebook',      label: 'Journal' },
  { id: 'mood',    icon: 'ti-mood-smile',    label: 'Mood' },
  { id: 'letters', icon: 'ti-mail',          label: 'Letters' },
  { id: 'bucket',  icon: 'ti-target',        label: 'Bucket' },
  { id: 'qod',     icon: 'ti-help-circle',   label: 'Q of Day' },
  { id: 'quiz',    icon: 'ti-brain',         label: 'Quiz' },
  { id: 'voice',   icon: 'ti-microphone',    label: 'Voice' },
]

export default function App() {
  const [currentUser, setCurrentUser] = useState('M')
  const [activeTab, setActiveTab] = useState('home')
  const [shared, setShared] = useState({})
  const [journal, setJournal] = useState([])
  const [letters, setLetters] = useState([])
  const [bucket, setBucket] = useState([])

  useEffect(() => {
    const unsubs = [
      subscribeShared(setShared),
      subscribeJournal(setJournal),
      subscribeLetters(setLetters),
      subscribeBucket(setBucket),
    ]
    return () => unsubs.forEach(u => u())
  }, [])

  const switchUser = (u) => setCurrentUser(u)
  const partner = currentUser === 'M' ? 'N' : 'M'

  return (
    <div style={{ minHeight: '100vh', maxWidth: 480, margin: '0 auto', display: 'flex', flexDirection: 'column' }}>
      {/* Header */}
      <div style={{ background: 'var(--pink-light)', color: '#4b1528', padding: 16, textAlign: 'center', borderBottom: '0.5px solid var(--pink-mid)' }}>
        <h1 style={{ fontSize: 20, fontWeight: 600, letterSpacing: 2, color: '#4b1528' }}>ALWAYS MN</h1>
        <p style={{ fontSize: 12, color: '#72243e', marginTop: 2 }}>always &amp; forever</p>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12, marginTop: 10 }}>
          {['M', 'N'].map((u, i) => (
            <>
              {i === 1 && <span key="sep" style={{ color: '#d4537e', fontSize: 16 }}>♥</span>}
              <div key={u} onClick={() => switchUser(u)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 6,
                  background: currentUser === u ? '#d4537e' : '#f4c0d1',
                  borderRadius: 20, padding: '4px 12px', cursor: 'pointer',
                  border: `1.5px solid ${currentUser === u ? '#d4537e' : '#ed93b1'}`,
                  color: currentUser === u ? '#fff' : '#4b1528',
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

      <div style={{ textAlign: 'center', fontSize: 11, color: 'var(--muted)', padding: 6, background: 'var(--card)' }}>
        Viewing as {currentUser} — tap a name to switch
      </div>

      {/* Nav */}
      <nav style={{ display: 'flex', background: 'var(--card)', borderTop: '0.5px solid var(--border)', overflowX: 'auto', padding: '4px 0' }}>
        {TABS.map(t => (
          <button key={t.id} onClick={() => setActiveTab(t.id)}
            style={{
              flex: 1, minWidth: 56, background: 'none', border: 'none',
              color: activeTab === t.id ? 'var(--pink)' : 'var(--muted)',
              padding: '8px 4px', cursor: 'pointer', fontSize: 10,
              display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3, whiteSpace: 'nowrap',
            }}>
            <i className={`ti ${t.icon}`} style={{ fontSize: 20 }} />
            {t.label}
          </button>
        ))}
      </nav>

      {/* Pages */}
      {activeTab === 'home'    && <HomeTab currentUser={currentUser} shared={shared} setShared={setShared} />}
      {activeTab === 'journal' && <JournalTab currentUser={currentUser} journal={journal} />}
      {activeTab === 'mood'    && <MoodTab currentUser={currentUser} shared={shared} />}
      {activeTab === 'letters' && <LettersTab currentUser={currentUser} letters={letters} />}
      {activeTab === 'bucket'  && <BucketTab bucket={bucket} />}
      {activeTab === 'qod'     && <QodTab />}
      {activeTab === 'quiz'    && <QuizTab />}
      {activeTab === 'voice'   && <VoiceTab currentUser={currentUser} />}

      <style>{`
        .card { background: var(--card); border: 0.5px solid var(--border); border-radius: 12px; padding: 14px; margin-bottom: 12px; }
        .card-title { font-size: 13px; font-weight: 500; color: var(--muted); margin-bottom: 8px; text-transform: uppercase; letter-spacing: 1px; }
      `}</style>
    </div>
  )
}
