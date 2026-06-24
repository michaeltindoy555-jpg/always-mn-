import { useState, useEffect } from 'react'
import { saveQodAnswers, getQodAnswers } from '../firebase/firestore'

// ── Q of the Day ──────────────────────────────────────────────────────────────
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

function QodSection() {
  const [qIdx, setQIdx]   = useState(0)
  const [ansM, setAnsM]   = useState('')
  const [ansN, setAnsN]   = useState('')
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

  return (
    <div>
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
      <button onClick={() => setQIdx(i => (i + 1) % QUESTIONS.length)} style={{ width: '100%', marginTop: 8, padding: 10, background: 'none', border: '0.5px solid var(--pink)', borderRadius: 8, color: 'var(--pink)', cursor: 'pointer', fontSize: 13 }}>
        Next question →
      </button>
    </div>
  )
}

// ── Would You Rather ──────────────────────────────────────────────────────────
function WyrSection() {
  const [phase, setPhase]         = useState('start')  // start | loading | answer | reveal
  const [question, setQuestion]   = useState(null)
  const [choiceM, setChoiceM]     = useState(null)
  const [choiceN, setChoiceN]     = useState(null)
  const [revealFor, setRevealFor] = useState(null)    // which user is currently answering
  const [error, setError]         = useState('')

  const generateWyr = async () => {
    setPhase('loading'); setError('')
    setChoiceM(null); setChoiceN(null); setRevealFor('M')
    try {
      const res = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'anthropic-version': '2023-06-01',
          'anthropic-dangerous-direct-browser-access': 'true',
          'x-api-key': import.meta.env.VITE_ANTHROPIC_KEY,
        },
        body: JSON.stringify({
          model: 'claude-sonnet-4-6', max_tokens: 300,
          messages: [{ role: 'user', content: `Generate 1 fun romantic "Would You Rather" question for a couple. Make both options interesting and relationship-themed or fun. Respond ONLY with a JSON object, no markdown: {"a":"option A text","b":"option B text"}` }],
        }),
      })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const data = await res.json()
      const text = (data.content || []).map(c => c.text || '').join('').trim()
      const clean = text.replace(/```json|```/g, '').trim()
      const q = JSON.parse(clean)
      if (!q.a || !q.b) throw new Error('Bad format')
      setQuestion(q)
      setPhase('answer')
    } catch (e) {
      setError('Could not load question: ' + e.message)
      setPhase('start')
    }
  }

  const pick = (user, choice) => {
    if (user === 'M') setChoiceM(choice)
    else setChoiceN(choice)

    // After both picked, reveal
    const mDone = user === 'M' ? choice : choiceM
    const nDone = user === 'N' ? choice : choiceN
    if (mDone && nDone) {
      setPhase('reveal')
    } else {
      // Switch to the other person's turn
      setRevealFor(user === 'M' ? 'N' : 'M')
    }
  }

  const agree = choiceM && choiceN && choiceM === choiceN

  if (phase === 'start') return (
    <div style={{ textAlign: 'center', padding: '10px 0 4px' }}>
      <div style={{ fontSize: 32, marginBottom: 8 }}>🤔</div>
      <p style={{ color: 'var(--muted)', fontSize: 13, marginBottom: 20 }}>AI picks a Would You Rather question. Both answer secretly, then reveal!</p>
      <button onClick={generateWyr} style={{ padding: '12px 32px', background: 'var(--pink)', color: '#fff', border: 'none', borderRadius: 10, fontSize: 15, fontWeight: 500, cursor: 'pointer' }}>
        Get a question ✨
      </button>
      {error && <p style={{ color: '#f09595', fontSize: 13, marginTop: 10 }}>{error}</p>}
    </div>
  )

  if (phase === 'loading') return (
    <div style={{ textAlign: 'center', padding: '20px 0', color: 'var(--muted)' }}>
      <i className="ti ti-loader" style={{ fontSize: 28, color: 'var(--pink)', display: 'block', marginBottom: 8, animation: 'spin 1s linear infinite' }} />
      <p>Thinking of a good one... 💭</p>
    </div>
  )

  if (phase === 'answer') return (
    <div>
      {/* Question card */}
      <div style={{ background: 'var(--card2)', border: '0.5px solid var(--pink)', borderRadius: 12, padding: 18, textAlign: 'center', marginBottom: 16 }}>
        <div style={{ fontSize: 11, color: 'var(--pink)', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 10 }}>Would You Rather...</div>
        <div style={{ fontSize: 15, fontWeight: 500, lineHeight: 1.5, color: 'var(--text)' }}>
          <span style={{ color: 'var(--pink)' }}>A)</span> {question.a}
          <span style={{ display: 'block', margin: '10px 0', color: 'var(--muted)', fontSize: 13 }}>— or —</span>
          <span style={{ color: 'var(--pink)' }}>B)</span> {question.b}
        </div>
      </div>

      {/* Current answerer */}
      <div style={{ textAlign: 'center', marginBottom: 12 }}>
        <span style={{ fontSize: 13, color: 'var(--muted)' }}>
          {revealFor === 'M'
            ? choiceN ? "M's turn to answer" : "M answers first"
            : "N's turn to answer"}
        </span>
        <div style={{ display: 'flex', gap: 8, marginTop: 12, justifyContent: 'center' }}>
          {['M', 'N'].map(u => {
            const done = u === 'M' ? !!choiceM : !!choiceN
            const isTurn = revealFor === u
            return (
              <div key={u} style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '4px 12px', borderRadius: 20,
                background: isTurn ? 'rgba(212,83,126,0.15)' : 'var(--card2)',
                border: `0.5px solid ${isTurn ? 'rgba(212,83,126,0.5)' : 'var(--border)'}` }}>
                <span style={{ fontSize: 13, fontWeight: 600, color: isTurn ? 'var(--pink)' : 'var(--muted)' }}>{u}</span>
                <span style={{ fontSize: 11 }}>{done ? '✓' : isTurn ? '...' : '⏳'}</span>
              </div>
            )
          })}
        </div>
      </div>

      {/* Answer buttons for current person */}
      {revealFor && !(revealFor === 'M' ? choiceM : choiceN) && (
        <div>
          <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--pink)', textAlign: 'center', marginBottom: 10, textTransform: 'uppercase', letterSpacing: 1 }}>
            {revealFor}, pick one:
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {[['A', question.a], ['B', question.b]].map(([key, text]) => (
              <button key={key} onClick={() => pick(revealFor, key)}
                style={{
                  padding: '14px 16px', background: 'var(--card2)',
                  border: '0.5px solid var(--border)', borderRadius: 10,
                  color: 'var(--text)', cursor: 'pointer', fontSize: 14, textAlign: 'left',
                  display: 'flex', gap: 10, alignItems: 'center',
                }}>
                <span style={{ color: 'var(--pink)', fontWeight: 700, fontSize: 16, minWidth: 20 }}>{key}</span>
                {text}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )

  if (phase === 'reveal') return (
    <div>
      {/* Question reminder */}
      <div style={{ background: 'var(--card2)', border: '0.5px solid var(--pink)', borderRadius: 12, padding: 14, textAlign: 'center', marginBottom: 16 }}>
        <div style={{ fontSize: 11, color: 'var(--pink)', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8 }}>Would You Rather...</div>
        <div style={{ fontSize: 13, color: 'var(--muted)' }}>
          <strong style={{ color: 'var(--text)' }}>A)</strong> {question.a}
          <span style={{ display: 'block', margin: '6px 0' }}>— or —</span>
          <strong style={{ color: 'var(--text)' }}>B)</strong> {question.b}
        </div>
      </div>

      {/* Results */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 14 }}>
        {[['M', choiceM], ['N', choiceN]].map(([u, choice]) => (
          <div key={u} style={{
            flex: 1, padding: 14, borderRadius: 12, textAlign: 'center',
            background: 'var(--card2)', border: `0.5px solid ${choice === (u === 'M' ? choiceN : choiceM) ? 'rgba(212,83,126,0.5)' : 'var(--border)'}`,
          }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--pink)', marginBottom: 6 }}>{u}</div>
            <div style={{ fontSize: 28, marginBottom: 4 }}>{choice === 'A' ? '🅰️' : '🅱️'}</div>
            <div style={{ fontSize: 12, color: 'var(--muted)' }}>chose {choice}</div>
            <div style={{ fontSize: 11, color: 'var(--text)', marginTop: 4, lineHeight: 1.3 }}>
              {choice === 'A' ? question.a : question.b}
            </div>
          </div>
        ))}
      </div>

      {/* Match verdict */}
      <div style={{
        textAlign: 'center', padding: '14px 16px', borderRadius: 12,
        background: agree ? 'rgba(212,83,126,0.1)' : 'rgba(100,60,180,0.08)',
        border: `0.5px solid ${agree ? 'rgba(212,83,126,0.4)' : 'rgba(100,60,180,0.3)'}`,
        marginBottom: 14,
      }}>
        <div style={{ fontSize: 28, marginBottom: 6 }}>{agree ? '💑' : '🤭'}</div>
        <div style={{ fontSize: 15, fontWeight: 600, color: agree ? 'var(--pink)' : 'var(--text)', marginBottom: 4 }}>
          {agree ? 'You matched! 🎉' : 'Different choices!'}
        </div>
        <div style={{ fontSize: 13, color: 'var(--muted)' }}>
          {agree ? 'You two think alike 💕' : `M chose ${choiceM}, N chose ${choiceN} — opposites attract! 💞`}
        </div>
      </div>

      <button onClick={generateWyr} style={{ width: '100%', padding: '12px 0', background: 'var(--pink)', color: '#fff', border: 'none', borderRadius: 10, fontSize: 14, fontWeight: 500, cursor: 'pointer' }}>
        Next question ✨
      </button>
    </div>
  )
}

// ── Trivia Quiz ───────────────────────────────────────────────────────────────
function TriviaSection() {
  const [phase, setPhase]     = useState('start')
  const [questions, setQuestions] = useState([])
  const [qIdx, setQIdx]       = useState(0)
  const [score, setScore]     = useState(0)
  const [answered, setAnswered] = useState(null)
  const [error, setError]     = useState('')

  const startQuiz = async () => {
    setPhase('loading'); setError('')
    try {
      const res = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'anthropic-version': '2023-06-01',
          'anthropic-dangerous-direct-browser-access': 'true',
          'x-api-key': import.meta.env.VITE_ANTHROPIC_KEY,
        },
        body: JSON.stringify({
          model: 'claude-sonnet-4-6', max_tokens: 1200,
          messages: [{ role: 'user', content: `Generate 7 fun multiple choice trivia questions for a couple's app. Mix romantic/relationship trivia AND fun general knowledge. Each has 4 options with exactly one correct. Respond ONLY with a JSON array, no markdown, no backticks: [{"q":"question text","options":["A","B","C","D"],"correct":0}]` }],
        }),
      })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const data = await res.json()
      const text = (data.content || []).map(c => c.text || '').join('').trim()
      const clean = text.replace(/```json|```/g, '').trim()
      const s = clean.indexOf('['), e = clean.lastIndexOf(']')
      if (s === -1 || e === -1) throw new Error('Invalid JSON')
      const qs = JSON.parse(clean.substring(s, e + 1))
      if (!Array.isArray(qs) || !qs.length) throw new Error('No questions')
      setQuestions(qs); setQIdx(0); setScore(0); setAnswered(null); setPhase('play')
    } catch (e) {
      setError('Could not load: ' + e.message); setPhase('start')
    }
  }

  const answer = (chosen) => {
    if (answered !== null) return
    const correct = questions[qIdx].correct
    setAnswered({ chosen, correct })
    if (chosen === correct) setScore(s => s + 1)
    setTimeout(() => {
      const next = qIdx + 1
      if (next < questions.length) { setQIdx(next); setAnswered(null) }
      else setPhase('result')
    }, 1000)
  }

  const pct = questions.length ? Math.round(score / questions.length * 100) : 0
  const msgs = ['Keep learning about each other! 💪', 'Not bad, love birds! 💕', 'Pretty good! You know each other well 🥰', 'Amazing! You two are so in sync! 💑']

  if (phase === 'start') return (
    <div style={{ textAlign: 'center', padding: '10px 0 4px' }}>
      <div style={{ fontSize: 32, marginBottom: 8 }}>🧠</div>
      <p style={{ color: 'var(--muted)', fontSize: 13, marginBottom: 20 }}>AI-generated questions about love, relationships, and general knowledge.</p>
      <button onClick={startQuiz} style={{ padding: '12px 32px', background: 'var(--pink)', color: '#fff', border: 'none', borderRadius: 10, fontSize: 15, fontWeight: 500, cursor: 'pointer' }}>Start Quiz</button>
      {error && <p style={{ color: '#f09595', fontSize: 13, marginTop: 10 }}>{error}</p>}
    </div>
  )

  if (phase === 'loading') return (
    <div style={{ textAlign: 'center', padding: '20px 0', color: 'var(--muted)' }}>
      <i className="ti ti-loader" style={{ fontSize: 28, color: 'var(--pink)', display: 'block', marginBottom: 8, animation: 'spin 1s linear infinite' }} />
      <p>AI is crafting your questions... 💭</p>
    </div>
  )

  if (phase === 'result') return (
    <div style={{ textAlign: 'center', padding: '10px 0' }}>
      <div style={{ fontSize: 40 }}>💑</div>
      <div style={{ fontSize: 42, fontWeight: 700, color: 'var(--pink)', margin: '10px 0' }}>{score} / {questions.length}</div>
      <div style={{ color: 'var(--muted)', fontSize: 14, marginBottom: 20 }}>{msgs[Math.min(3, Math.floor(pct / 25))]}</div>
      <button onClick={startQuiz} style={{ padding: '12px 32px', background: 'var(--pink)', color: '#fff', border: 'none', borderRadius: 10, fontSize: 15, fontWeight: 500, cursor: 'pointer' }}>Play Again</button>
    </div>
  )

  const q = questions[qIdx]
  return (
    <div>
      <p style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 12 }}>Question {qIdx + 1} of {questions.length}</p>
      <div className="card">
        <p style={{ fontSize: 15, fontWeight: 500, marginBottom: 12, lineHeight: 1.5 }}>{q.q}</p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {q.options.map((opt, i) => {
            let bg = 'var(--card2)', border = 'var(--border)', color = 'var(--text)'
            if (answered !== null) {
              if (i === answered.correct) { bg = '#0a2a1a'; border = '#1d9e75'; color = '#5dcaa5' }
              else if (i === answered.chosen && i !== answered.correct) { bg = '#2a0a0a'; border = '#a32d2d'; color = '#f09595' }
            }
            return (
              <button key={i} onClick={() => answer(i)}
                style={{ padding: '10px 14px', background: bg, border: `0.5px solid ${border}`, borderRadius: 8, color, cursor: 'pointer', fontSize: 14, textAlign: 'left', transition: 'all .2s' }}>
                {opt}
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
}

// ── Main component ─────────────────────────────────────────────────────────────
const TABS = [
  { id: 'qod',    label: '❓ Q of the Day' },
  { id: 'wyr',    label: '🤔 Would You Rather' },
  { id: 'trivia', label: '🧠 Trivia Quiz' },
]

export default function QuizTab() {
  const [activeSection, setActiveSection] = useState('qod')

  return (
    <div style={{ flex: 1, padding: 16, overflowY: 'auto' }}>
      {/* Section tabs */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 16 }}>
        {TABS.map(t => (
          <button key={t.id} onClick={() => setActiveSection(t.id)}
            style={{
              flex: 1, padding: '8px 4px', fontSize: 11,
              background: activeSection === t.id ? 'var(--pink)' : 'var(--card2)',
              color: activeSection === t.id ? '#fff' : 'var(--muted)',
              border: `0.5px solid ${activeSection === t.id ? 'var(--pink)' : 'var(--border)'}`,
              borderRadius: 8, cursor: 'pointer', fontWeight: activeSection === t.id ? 600 : 400,
              transition: 'all .15s',
            }}>
            {t.label}
          </button>
        ))}
      </div>

      {activeSection === 'qod'    && <QodSection />}
      {activeSection === 'wyr'    && <WyrSection />}
      {activeSection === 'trivia' && <TriviaSection />}
    </div>
  )
}
