import { useState, useEffect } from 'react'
import { saveQodAnswers, getQodAnswers } from '../firebase/firestore'

const QUESTIONS = [
  "If you could travel anywhere together right now, where would you go?",
  "What's one thing your partner does that always makes you smile?",
  "What's your partner's love language?",
  "If you had a whole weekend with no plans, how would you spend it?",
  "What's a small habit of your partner's that you secretly love?",
  "What song reminds you most of your relationship?",
  "If you could relive one moment together, which would it be?",
  "What's something your partner taught you about yourself?",
  "What's a dream you both share?",
  "What made you fall for your partner?",
]

export default function QodTab() {
  const [qIdx, setQIdx] = useState(0)
  const [ansM, setAnsM] = useState('')
  const [ansN, setAnsN] = useState('')
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    getQodAnswers(qIdx).then(data => {
      setAnsM(data.ansM || '')
      setAnsN(data.ansN || '')
    })
  }, [qIdx])

  const handleSave = async () => {
    await saveQodAnswers(qIdx, ansM, ansN)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  const nextQ = () => {
    setQIdx(i => (i + 1) % QUESTIONS.length)
  }

  return (
    <div style={{ flex: 1, padding: 16, overflowY: 'auto' }}>
      <div style={{ background: 'var(--card2)', border: '0.5px solid var(--pink)', borderRadius: 12, padding: 20, textAlign: 'center', marginBottom: 14 }}>
        <div style={{ fontSize: 11, color: 'var(--pink)', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 12 }}>Question of the Day</div>
        <div style={{ fontSize: 18, fontWeight: 500, lineHeight: 1.5 }}>{QUESTIONS[qIdx]}</div>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {[['M', ansM, setAnsM], ['N', ansN, setAnsN]].map(([who, val, setter]) => (
          <div key={who} style={{ background: 'var(--card)', border: '0.5px solid var(--border)', borderRadius: 10, padding: 12 }}>
            <div style={{ fontSize: 11, color: 'var(--pink)', fontWeight: 600, marginBottom: 6 }}>{who}'s Answer</div>
            <textarea value={val} onChange={e => setter(e.target.value)} placeholder="Your answer..."
              style={{ width: '100%', background: 'var(--card2)', border: '0.5px solid var(--border)', borderRadius: 6, color: 'var(--text)', padding: 8, fontSize: 13, resize: 'none', minHeight: 60 }} />
          </div>
        ))}
      </div>
      <button onClick={handleSave} style={{ width: '100%', marginTop: 8, padding: 10, background: 'var(--pink)', color: '#fff', border: 'none', borderRadius: 8, cursor: 'pointer', fontSize: 14, fontWeight: 500 }}>
        {saved ? '✓ Saved!' : 'Save answers'}
      </button>
      <button onClick={nextQ} style={{ width: '100%', marginTop: 12, padding: 10, background: 'none', border: '0.5px solid var(--pink)', borderRadius: 8, color: 'var(--pink)', cursor: 'pointer', fontSize: 13 }}>
        Next question →
      </button>
    </div>
  )
}
