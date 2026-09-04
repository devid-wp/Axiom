import { useEffect, useMemo, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { translations, Lang } from './i18n/translations'
import { courses, topics, Category, Course, Lesson, Topic } from './data/content'

type View = 'home' | 'study' | 'explore' | 'lesson' | 'topic'

export default function App() {
  const [lang, setLang] = useState<Lang>('en')
  const t = translations[lang]
  const [view, setView] = useState<View>('home')
  const [showSplash, setShowSplash] = useState(true)
  const [selectedCourseId, setSelectedCourseId] = useState<string>(courses[0].id)
  const [selectedLessonId, setSelectedLessonId] = useState<string>(courses[0].lessons[0].id)
  const [selectedTopicId, setSelectedTopicId] = useState<string>('gothic')
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState<Category | 'all'>('all')
  const [completed, setCompleted] = useState<Record<string, boolean>>(() => {
    try { return JSON.parse(localStorage.getItem('axiom_completed') || '{}') } catch { return {} }
  })
  const [quizAnswer, setQuizAnswer] = useState<number | null>(null)

  useEffect(() => {
    const id = setTimeout(() => setShowSplash(false), 2200)
    return () => clearTimeout(id)
  }, [])
  useEffect(() => { localStorage.setItem('axiom_completed', JSON.stringify(completed)) }, [completed])

  const selectedCourse: Course | undefined = useMemo(() => courses.find(c => c.id === selectedCourseId), [selectedCourseId])
  const selectedLesson: Lesson | undefined = useMemo(() => selectedCourse?.lessons.find(l => l.id === selectedLessonId), [selectedCourse, selectedLessonId])
  const selectedTopic: Topic | undefined = useMemo(() => topics.find(tp => tp.id === selectedTopicId), [selectedTopicId])

  const filteredTopics = useMemo(() => {
    return topics.filter(tp => {
      const matchesFilter = filter === 'all' || tp.category === filter
      const q = search.toLowerCase()
      const matchesSearch = !q || tp.title[lang].toLowerCase().includes(q) || tp.desc[lang].toLowerCase().includes(q)
      return matchesFilter && matchesSearch
    })
  }, [filter, search, lang])

  const progressFor = (c: Course) => {
    const done = c.lessons.filter(l => completed[c.id + ':' + l.id]).length
    return Math.round((done / c.lessons.length) * 100)
  }

  const navigateToLesson = (courseId: string, lessonId: string) => {
    setSelectedCourseId(courseId)
    setSelectedLessonId(lessonId)
    setQuizAnswer(null)
    setView('lesson')
  }

  return (
    <>
      <AnimatePresence>
        {showSplash && (
          <motion.div className="splash" initial={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.7, ease: [0.4, 0, 0.2, 1] }}>
            <motion.div className="splash-inner" initial={{ y: 12, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ duration: 0.6, delay: 0.1 }}>
              <motion.div className="logo-mark" initial={{ scale: 0.9, rotate: -4 }} animate={{ scale: 1, rotate: 0 }} transition={{ type: 'spring', stiffness: 260, damping: 18 }}>
                A
              </motion.div>
              <div className="splash-title">AXIOM</div>
              <div className="splash-sub">{t.tagline}</div>
              <div className="splash-loader"><motion.div className="splash-bar" initial={{ x: -140 }} animate={{ x: 140 }} transition={{ repeat: Infinity, duration: 0.9, ease: 'easeInOut' }} /></div>
              <div style={{ marginTop: 12, fontSize: 11, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--muted)' }}>{t.splashLoading}…</div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="app">
        <aside className="sidebar">
          <div className="sidebar-logo">A</div>
          <button className={`nav-btn ${view === 'home' ? 'active' : ''}`} onClick={() => setView('home')}><span className="icon">⌖</span>{t.navHome}</button>
          <button className={`nav-btn ${view === 'study' || view === 'lesson' ? 'active lime' : ''}`} onClick={() => setView('study')}><span className="icon">◐</span>{t.navStudy}</button>
          <button className={`nav-btn ${view === 'explore' || view === 'topic' ? 'active' : ''}`} onClick={() => setView('explore')}><span className="icon">⬢</span>{t.navExplore}</button>

          <div className="lang-switch">
            <div style={{ fontSize: 9, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--muted)', fontWeight: 700 }}>{t.language}</div>
            <button className={`lang-btn ${lang === 'en' ? 'active' : ''}`} onClick={() => setLang('en')}>EN</button>
            <button className={`lang-btn ${lang === 'ru' ? 'active' : ''}`} onClick={() => setLang('ru')}>RU</button>
          </div>
        </aside>

        <div className="main">
          <div className="topbar">
            <div className="breadcrumb">
              <span style={{ width: 6, height: 6, borderRadius: 999, background: 'var(--lime)', display: 'inline-block' }} />
              <span>AXIOM</span> <span style={{ opacity: 0.4 }}>—</span> <b>{view === 'home' ? t.navHome : view === 'study' || view === 'lesson' ? t.navStudy : t.navExplore}</b>
              {view === 'lesson' && selectedCourse && <> <span style={{ opacity: 0.4 }}>/</span> <span>{selectedCourse.title[lang]}</span></>}
            </div>
            <label className="search">
              <span style={{ color: 'var(--muted)' }}>⌕</span>
              <input value={search} onChange={e => setSearch(e.target.value)} placeholder={t.searchPlaceholder} onFocus={() => setView('explore')} />
            </label>
          </div>

          <AnimatePresence mode="wait">
            {view === 'home' && (
              <motion.div key="home" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}>
                <div className="hero">
                  <div className="hero-left">
                    <div className="kicker" style={{ color: 'var(--lime)' }}>{t.designedFor} — 2026</div>
                    <h1>{t.homeHeroTitle} <i>{t.homeHeroTitleAccent}</i></h1>
                    <p className="hero-desc">{t.homeHeroDesc}</p>
                    <div className="hero-actions">
                      <button className="btn-primary" onClick={() => setView('study')}>{t.enterStudy} →</button>
                      <button className="btn-ghost" onClick={() => setView('explore')}>{t.enterExplore}</button>
                    </div>
                  </div>
                  <div className="hero-right">
                    <div className="kicker">AXIOM OS • PREMIUM</div>
                    <div style={{ fontFamily: 'Space Grotesk', fontSize: 20, fontWeight: 700, marginTop: 8, letterSpacing: -0.6 }}>Constructive intelligence.</div>
                    <p style={{ color: 'var(--muted)', fontSize: 12.5, lineHeight: 1.6, marginTop: 8 }}>Glass, grid and precise animation. Study or wander — your path stays tracked locally, no account needed.</p>
                    <div className="stats">
                      <div className="stat"><b>8</b><p>{t.statsCourses}</p></div>
                      <div className="stat"><b>28</b><p>{t.statsLessons}</p></div>
                      <div className="stat"><b>60+</b><p>{t.statsTopics}</p></div>
                      <div className="stat"><b>12h</b><p>{t.statsHours}</p></div>
                    </div>
                  </div>
                </div>

                <div className="section">
                  <div className="section-head"><h2>{t.featuredCourses}</h2><p>Curated • Visual • Local progress</p></div>
                  <div className="cards">
                    <motion.div className="card" whileHover={{ y: -2 }} onClick={() => setView('study')} style={{ background: 'linear-gradient(135deg, #1E2028, #15171D)', borderColor: 'rgba(230,255,82,0.18)' }}>
                      <div className="card-top"><span className="badge" style={{ background: 'var(--lime)', color: '#07080A', borderColor: 'transparent' }}>Study Mode</span><span className="card-icon">◐</span></div>
                      <h3>{t.homeCardStudyTitle}</h3><p>{t.homeCardStudyDesc}</p>
                      <div className="card-meta"><div className="progress-track"><div className="progress-fill" style={{ width: '34%', background: 'var(--lime)' }} /></div><span className="card-cta">{t.enterStudy} →</span></div>
                    </motion.div>
                    <motion.div className="card" whileHover={{ y: -2 }} onClick={() => setView('explore')}>
                      <div className="card-top"><span className="badge">Explore Mode</span><span className="card-icon">⬢</span></div>
                      <h3>{t.homeCardExploreTitle}</h3><p>{t.homeCardExploreDesc}</p>
                      <div className="card-meta"><div className="progress-track"><div className="progress-fill" style={{ width: '62%', background: 'var(--lav)' }} /></div><span className="card-cta">{t.enterExplore} →</span></div>
                    </motion.div>
                  </div>
                </div>

                <div className="section">
                  <div className="section-head"><h2>{t.continueLearning}</h2><p>{courses.reduce((a, c) => a + progressFor(c), 0) / courses.length | 0}% {t.progress.toLowerCase()}</p></div>
                  <div className="grid-courses">
                    {courses.slice(0, 2).map(c => (
                      <div key={c.id} className="card" onClick={() => navigateToLesson(c.id, c.lessons[0].id)}>
                        <div className="card-top"><span className="badge" style={{ borderColor: c.accent, color: c.accent }}>{c.level}</span><span className="card-icon" style={{ background: c.accent, color: '#07080A' }}>{c.image}</span></div>
                        <h3>{c.title[lang]}</h3><p>{c.desc[lang]}</p>
                        <div className="card-meta"><div className="progress-track"><div className="progress-fill" style={{ width: `${progressFor(c)}%`, background: c.accent }} /></div><span style={{ fontSize: 11, color: 'var(--muted)', fontWeight: 700 }}>{progressFor(c)}%</span></div>
                      </div>
                    ))}
                  </div>
                  <p style={{ marginTop: 14, fontSize: 11, color: 'var(--muted2)', letterSpacing: '0.06em' }}>{t.footerMotto}</p>
                </div>
              </motion.div>
            )}

            {view === 'study' && (
              <motion.div key="study" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.3 }}>
                <div style={{ padding: '22px 28px 0' }}>
                  <div className="kicker" style={{ color: 'var(--lime)' }}>Study Mode • {t.studyDesc}</div>
                  <h1 style={{ fontFamily: 'Space Grotesk', fontSize: 30, letterSpacing: -0.8, marginTop: 6 }}>{t.studyHeading}</h1>
                  <p style={{ color: 'var(--muted)', fontSize: 13, marginTop: 6 }}>{t.studyDesc}</p>
                </div>
                <div className="section">
                  <div className="grid-courses">
                    {courses.map(c => {
                      const pct = progressFor(c)
                      return (
                        <motion.div key={c.id} className="card" whileHover={{ y: -3 }} onClick={() => navigateToLesson(c.id, c.lessons.find(l => !completed[c.id + ':' + l.id])?.id || c.lessons[0].id)}>
                          <div className="card-top"><span className="badge" style={{ color: c.accent, borderColor: 'rgba(255,255,255,0.12)' }}>{c.level}</span><span className="card-icon" style={{ background: c.accent, color: '#0A0B0E' }}>{c.image}</span></div>
                          <h3>{c.title[lang]}</h3><p>{c.desc[lang]}</p>
                          <div style={{ display: 'flex', gap: 6, marginTop: 12, flexWrap: 'wrap' }}>
                            {c.lessons.map(l => (
                              <span key={l.id} style={{ width: 22, height: 22, borderRadius: 999, display: 'grid', placeItems: 'center', fontSize: 10, fontWeight: 700, background: completed[c.id + ':' + l.id] ? c.accent : 'rgba(255,255,255,0.07)', color: completed[c.id + ':' + l.id] ? '#07080A' : 'var(--muted)', border: '1px solid var(--border)' }}>{completed[c.id + ':' + l.id] ? '✓' : '·'}</span>
                            ))}
                            <span style={{ fontSize: 11, color: 'var(--muted)', alignSelf: 'center', marginLeft: 6 }}>{c.lessonsCount} {t.lessons} • {pct}%</span>
                          </div>
                          <div className="card-meta"><div className="progress-track"><div className="progress-fill" style={{ width: `${pct}%`, background: c.accent }} /></div><span className="card-cta" style={{ color: c.accent }}>{pct ? t.resume : t.startCourse} →</span></div>
                        </motion.div>
                      )
                    })}
                  </div>
                </div>
              </motion.div>
            )}

            {view === 'explore' && (
              <motion.div key="explore" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.3 }}>
                <div style={{ padding: '22px 28px 0' }}>
                  <h1 style={{ fontFamily: 'Space Grotesk', fontSize: 30, letterSpacing: -0.8 }}>{t.exploreHeading}</h1>
                  <p style={{ color: 'var(--muted)', fontSize: 13, marginTop: 6 }}>{t.exploreDesc}</p>
                  <div className="chips" style={{ marginTop: 14 }}>
                    {(['all', 'styles', 'structures', 'materials', 'engineering'] as const).map(cat => (
                      <button key={cat} className={`chip ${filter === cat ? 'active' : ''}`} style={filter === cat && cat !== 'all' ? { background: 'var(--lime)', color: '#07080A', borderColor: 'var(--lime)' } as any : undefined} onClick={() => setFilter(cat as any)}>
                        {cat === 'all' ? t.all : t[cat as Category]}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="section">
                  <div className="topic-grid">
                    {filteredTopics.map(tp => (
                      <motion.div key={tp.id} className="topic-card" whileHover={{ y: -3 }} onClick={() => { setSelectedTopicId(tp.id); setView('topic') }}>
                        <div className="topic-emoji">{tp.image}</div>
                        <h4>{tp.title[lang]}</h4>
                        <p>{tp.desc[lang]}</p>
                        <div className="topic-meta"><span className="pill">{tp.category}</span><span className="pill">{tp.readTime}</span><span className="pill" style={{ color: 'var(--lime)', borderColor: 'rgba(230,255,82,0.25)' }}>{tp.level}</span></div>
                      </motion.div>
                    ))}
                  </div>
                  {filteredTopics.length === 0 && <p style={{ color: 'var(--muted)', marginTop: 18 }}>No results for “{search}”</p>}
                </div>
              </motion.div>
            )}

            {view === 'lesson' && selectedCourse && selectedLesson && (
              <motion.div key="lesson" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.3 }}>
                <div className="lesson-layout">
                  <div className="lesson-nav">
                    <button className="btn-ghost" style={{ width: '100%', marginBottom: 12, justifyContent: 'center' }} onClick={() => setView('study')}>← {t.backToStudy}</button>
                    <h4>{selectedCourse.title[lang]}</h4>
                    {selectedCourse.lessons.map(l => {
                      const key = selectedCourse.id + ':' + l.id
                      const isActive = l.id === selectedLessonId
                      const isDone = !!completed[key]
                      return (
                        <div key={l.id} className={`lesson-item ${isActive ? 'active' : ''} ${isDone ? 'done' : ''}`} onClick={() => { setSelectedLessonId(l.id); setQuizAnswer(null) }}>
                          <div className="lesson-dot">{isDone ? '✓' : selectedCourse.lessons.indexOf(l) + 1}</div>
                          <div><p>{l.title[lang]}</p><span>{l.duration} • {isDone ? t.completed : t.lessonView}</span></div>
                        </div>
                      )
                    })}
                    <div style={{ marginTop: 12, padding: 10, borderRadius: 12, background: 'rgba(230,255,82,0.08)', border: '1px solid rgba(230,255,82,0.18)', fontSize: 11, color: 'var(--muted)', lineHeight: 1.5 }}>
                      {t.progress}: <b style={{ color: 'var(--lime)' }}>{progressFor(selectedCourse)}%</b><div className="progress-track" style={{ marginTop: 8 }}><div className="progress-fill" style={{ width: `${progressFor(selectedCourse)}%`, background: selectedCourse.accent }} /></div>
                    </div>
                  </div>

                  <div className="lesson-content">
                    <div className="lesson-eyebrow">{t.lessonView} {selectedCourse.lessons.findIndex(l => l.id === selectedLessonId) + 1} — {selectedLesson.duration}</div>
                    <h2>{selectedLesson.title[lang]}</h2>
                    <article>
                      {selectedLesson.content[lang].map((p, i) => <p key={i}>{p}</p>)}
                    </article>

                    <div className="quiz">
                      <h4>◆ {t.quizTitle}</h4>
                      <q>{selectedLesson.quiz.q[lang]}</q>
                      {selectedLesson.quiz.options[lang].map((opt, i) => {
                        let cls = 'quiz-opt'
                        if (quizAnswer !== null) {
                          if (i === selectedLesson.quiz.correct) cls += ' correct'
                          else if (i === quizAnswer && i !== selectedLesson.quiz.correct) cls += ' wrong'
                        }
                        return <button key={i} className={cls} onClick={() => setQuizAnswer(i)}>{opt}</button>
                      })}
                      {quizAnswer !== null && (
                        <div className={`quiz-feedback ${quizAnswer === selectedLesson.quiz.correct ? 'ok' : 'bad'}`}>
                          {quizAnswer === selectedLesson.quiz.correct ? `✓ ${t.quizCorrect}` : `✕ ${t.quizWrong}`}
                        </div>
                      )}
                    </div>

                    <div className="lesson-actions">
                      {selectedCourse.lessons.findIndex(l => l.id === selectedLessonId) > 0 && (
                        <button className="btn-ghost" onClick={() => {
                          const idx = selectedCourse.lessons.findIndex(l => l.id === selectedLessonId)
                          setSelectedLessonId(selectedCourse.lessons[idx - 1].id); setQuizAnswer(null)
                        }}>{t.prevLesson}</button>
                      )}
                      <button
                        className="btn-primary"
                        style={{ background: completed[selectedCourse.id + ':' + selectedLessonId] ? 'var(--text)' : 'var(--lime)' }}
                        onClick={() => setCompleted(c => ({ ...c, [selectedCourse.id + ':' + selectedLessonId]: !c[selectedCourse.id + ':' + selectedLessonId] }))}
                      >
                        {completed[selectedCourse.id + ':' + selectedLessonId] ? `✓ ${t.completed}` : t.complete}
                      </button>
                      {(() => {
                        const idx = selectedCourse.lessons.findIndex(l => l.id === selectedLessonId)
                        if (idx < selectedCourse.lessons.length - 1) {
                          return <button className="btn-primary" style={{ marginLeft: 'auto' }} onClick={() => { setSelectedLessonId(selectedCourse.lessons[idx + 1].id); setQuizAnswer(null) }}>{t.nextLesson} →</button>
                        }
                        return <button className="btn-ghost" style={{ marginLeft: 'auto' }} onClick={() => setView('study')}>{t.backToStudy}</button>
                      })()}
                    </div>
                  </div>
                </div>
              </motion.div>
            )}

            {view === 'topic' && selectedTopic && (
              <motion.div key="topic" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.3 }} className="detail-page">
                <button className="btn-ghost" onClick={() => setView('explore')}>← {t.backToExplore}</button>
                <div className="detail-card" style={{ marginTop: 16 }}>
                  <div style={{ fontSize: 36 }}>{selectedTopic.image}</div>
                  <div className="kicker" style={{ marginTop: 10, color: 'var(--lime)' }}>{selectedTopic.category} • {selectedTopic.readTime} • {selectedTopic.level}</div>
                  <h2>{selectedTopic.title[lang]}</h2>
                  <p className="lead">{selectedTopic.desc[lang]}</p>
                  <article>
                    {selectedTopic.content.map((c, i) => <p key={i}>{(c as any)[lang]}</p>)}
                    <p style={{ color: 'var(--muted)', fontSize: 12, borderTop: '1px solid var(--border)', paddingTop: 12, marginTop: 16 }}>
                      AXIOM note — this is mock educational content. Real articles will include sections, diagrams and linked lessons.
                    </p>
                  </article>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </>
  )
}
