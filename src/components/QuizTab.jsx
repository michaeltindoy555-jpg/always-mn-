import { useState } from 'react'

export default function QuizTab() {
  const [phase, setPhase] = useState('start') // start | loading | play | result
  const [questions, setQuestions] = useState([])
  const [qIdx, setQIdx] = useState(0)
  const [score, setScore] = useState(0)
  const [answered, setAnswered] = useState(null)
  const [error, setError] = useState('')

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
          messages: [{ role: 'user', content: `Generate 7 fun multiple choice trivia questions for a couple's app. Mix romantic/relationship trivia AND fun general knowledge. Each has 4 options with exactly one correct. Respond ONLY with a JSON array, no markdown, no backticks, no explanation. Format: [{"q":"question text","options":["A","B","C","D"],"correct":0}] where correct is the 0-based index of the correct answer.` }],
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
    const isCorrect = chosen === correct
    setAnswered({ chosen, correct })
    if (isCorrect) setScore(s => s + 1)
    setTimeout(() => {
      const next = qIdx + 1
      if (next < questions.length) { setQIdx(next); setAnswered(null) }
      else setPhase('result')
    }, 1000)
  }

  const pct = questions.length ? Math.round(score / questions.length * 100) : 0
  const msgs = ['Keep learning about each other! 💪', 'Not bad, love birds! 💕', 'Pretty good! You know each other well 🥰', 'Amazing! You two are so in sync! 💑']

  if (phase === 'start') return (
    <div style={{ flex: 1, padding: 16, textAlign: 'center' }}>
      <div style={{ fontSize: 40, marginBottom: 8 }}>🧠</div>
      <h2 style={{ fontSize: 18, fontWeight: 600 }}>Couple Trivia Quiz</h2>
      <p style={{ color: 'var(--muted)', fontSize: 13, margin: '8px 0 20px' }}>AI-generated questions about love, relationships, and each other.</p>
      <button onClick={startQuiz} style={{ padding: '12px 32px', background: 'var(--pink)', color: '#fff', border: 'none', borderRadius: 10, fontSize: 15, fontWeight: 500, cursor: 'pointer' }}>Start Quiz</button>
      {error && <p style={{ color: '#f09595', fontSize: 13, marginTop: 10 }}>{error}</p>}
    </div>
  )

  if (phase === 'loading') return (
    <div style={{ flex: 1, padding: 16, textAlign: 'center', color: 'var(--muted)' }}>
      <i className="ti ti-loader" style={{ fontSize: 32, color: 'var(--pink)', display: 'block', marginBottom: 10, animation: 'spin 1s linear infinite' }} />
      <p>AI is crafting your questions...</p>
    </div>
  )

  if (phase === 'result') return (
    <div style={{ flex: 1, padding: 16, textAlign: 'center' }}>
      <div style={{ fontSize: 40 }}>💑</div>
      <div style={{ fontSize: 42, fontWeight: 700, color: 'var(--pink)', margin: '10px 0' }}>{score} / {questions.length}</div>
      <div style={{ color: 'var(--muted)', fontSize: 14, marginBottom: 20 }}>{msgs[Math.min(3, Math.floor(pct / 25))]}</div>
      <button onClick={startQuiz} style={{ padding: '12px 32px', background: 'var(--pink)', color: '#fff', border: 'none', borderRadius: 10, fontSize: 15, fontWeight: 500, cursor: 'pointer' }}>Play Again</button>
    </div>
  )

  const q = questions[qIdx]
  return (
    <div style={{ flex: 1, padding: 16, overflowY: 'auto' }}>
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
