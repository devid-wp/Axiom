import { useEffect, useMemo, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { translations, Lang } from './i18n/translations'
import { courses, topics, Category, Course, Lesson, Topic } from './data/content'

type View = 'home' | 'study' | 'explore' | 'lesson' | 'topic'

const pageMotion = {
  initial: { opacity: 0, y: 14, filter: 'blur(8px)' as any },
  animate: { opacity: 1, y: 0, filter: 'blur(0px)' as any },
  exit: { opacity: 0, y: -10, filter: 'blur(6px)' as any },
  transition: { duration: 0.42, ease: [0.22, 1, 0.36, 1] as any }
}
const stagger = {
  animate: { transition: { staggerChildren: 0.07, delayChildren: 0.08 } }
}
const cardMotion = {
  initial: { opacity: 0, y: 16, scale: 0.98 },
  animate: { opacity: 1, y: 0, scale: 1 },
  transition: { type: 'spring' as const, stiffness: 280, damping: 22 }
}

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
    const id = setTimeout(() => setShowSplash(false), 2000)
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
    <div className="desktop-shell">
      <motion.div className="titlebar" initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1], delay: 2.05 }}>
        <div className="titlebar-left">
          <div className="traffic"><span /><span /><span /></div>
          <div className="titlebar-app">
            <div className="titlebar-mark">A</div>
            <span className="titlebar-name">AXIOM</span>
            <span className="titlebar-sub">— Architecture Learning OS</span>
          </div>
        </div>
        <div className="titlebar-right">
          <span className="titlebar-dot" />
          <span>Local • Offline Ready</span>
          <span style={{ opacity: 0.25, margin: '0 6px' }}>|</span>
          <span style={{ fontWeight: 700, color: 'var(--text)' }}>{lang.toUpperCase()}</span>
        </div>
      </motion.div>

      <AnimatePresence>
        {showSplash && (
          <motion.div className="splash" initial={{ opacity: 1 }} exit={{ opacity: 0, filter: 'blur(10px)' as any }} transition={{ duration: 0.72, ease: [0.4, 0, 0.2, 1] }}>
            <motion.div className="splash-inner" initial={{ y: 16, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ duration: 0.65, delay: 0.08, ease: [0.22, 1, 0.36, 1] }}>
              <motion.div className="logo-mark" initial={{ scale: 0.86, rotate: -6, opacity: 0 }} animate={{ scale: 1, rotate: 0, opacity: 1 }} transition={{ type: 'spring', stiffness: 280, damping: 18, delay: 0.15 }}>
                A
              </motion.div>
              <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.28, duration: 0.5 }}>
                <div className="splash-title">AXIOM</div>
                <div className="splash-sub">{t.tagline}</div>
              </motion.div>
              <div className="splash-loader"><motion.div className="splash-bar" initial={{ x: -160 }} animate={{ x: 160 }} transition={{ repeat: Infinity, duration: 1, ease: 'easeInOut' }} /></div>
              <motion.div style={{ marginTop: 14, fontSize: 10.5, letterSpacing: '0.16em', textTransform: 'uppercase', color: 'var(--muted)', fontWeight: 700 }} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.6 }}>{t.splashLoading}…</motion.div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="app">
        <motion.aside
          className="sidebar"
          initial={{ x: -24, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          transition={{ duration: 0.62, ease: [0.22, 1, 0.36, 1], delay: 2.12 }}
        >
          <motion.div className="sidebar-logo" whileHover={{ scale: 1.06, rotate: 2 }} transition={{ type: 'spring', stiffness: 400, damping: 15 }}>A</motion.div>
          {[
            { id: 'home', icon: '⌖', label: t.navHome },
            { id: 'study', icon: '◐', label: t.navStudy },
            { id: 'explore', icon: '⬢', label: t.navExplore },
          ].map((item, i) => (
            <motion.button
              key={item.id}
              className={`nav-btn ${view === item.id || (item.id === 'study' && view === 'lesson') || (item.id === 'explore' && view === 'topic') ? 'active' + (item.id === 'study' ? ' purple' : '') : ''}`}
              onClick={() => setView(item.id as View)}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 2.22 + i * 0.06, duration: 0.4 }}
              whileHover={{ y: -2 }}
              whileTap={{ scale: 0.96 }}
            >
              <span className="icon">{item.icon}</span>{item.label}
            </motion.button>
          ))}

          <motion.div className="lang-switch" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 2.45, duration: 0.4 }}>
            <div style={{ fontSize: 9, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--muted)', fontWeight: 700 }}>{t.language}</div>
            <button className={`lang-btn ${lang === 'en' ? 'active' : ''}`} onClick={() => setLang('en')}>EN</button>
            <button className={`lang-btn ${lang === 'ru' ? 'active' : ''}`} onClick={() => setLang('ru')}>RU</button>
          </motion.div>
        </motion.aside>

        <div className="main">
          <motion.div className="topbar" initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.52, ease: [0.22, 1, 0.36, 1], delay: 2.18 }}>
            <div className="breadcrumb">
              <span style={{ width: 7, height: 7, borderRadius: 999, background: 'var(--purple)', display: 'inline-block', boxShadow: '0 0 10px var(--purple-glow)' }} />
              <span>AXIOM</span> <span style={{ opacity: 0.35 }}>—</span> <b>{view === 'home' ? t.navHome : view === 'study' || view === 'lesson' ? t.navStudy : t.navExplore}</b>
              {view === 'lesson' && selectedCourse && <> <span style={{ opacity: 0.35 }}>/</span> <span>{selectedCourse.title[lang]}</span></>}
            </div>
            <label className="search">
              <span style={{ color: 'var(--muted)' }}>⌕</span>
              <input value={search} onChange={e => setSearch(e.target.value)} placeholder={t.searchPlaceholder} onFocus={() => setView('explore')} />
            </label>
          </motion.div>

          <AnimatePresence mode="wait">
            {view === 'home' && (
              <motion.div key="home" {...pageMotion}>
                <motion.div className="hero" initial="initial" animate="animate" variants={stagger}>
                  <motion.div className="hero-left" variants={cardMotion}>
                    <div className="kicker" style={{ color: 'var(--purple2)' }}>{t.designedFor} — 2026</div>
                    <h1>{t.homeHeroTitle} <i>{t.homeHeroTitleAccent}</i></h1>
                    <p className="hero-desc">{t.homeHeroDesc}</p>
                    <div className="hero-actions">
                      <motion.button className="btn-primary" onClick={() => setView('study')} whileHover={{ y: -2 }} whileTap={{ scale: 0.98 }}>{t.enterStudy} →</motion.button>
                      <motion.button className="btn-ghost" onClick={() => setView('explore')} whileHover={{ y: -2 }} whileTap={{ scale: 0.98 }}>{t.enterExplore}</motion.button>
                    </div>
                  </motion.div>
                  <motion.div className="hero-right" variants={cardMotion}>
                    <div className="kicker">AXIOM OS • PREMIUM</div>
                    <div style={{ fontFamily: 'Space Grotesk', fontSize: 20, fontWeight: 700, marginTop: 10, letterSpacing: -0.6 }}>Constructive intelligence.</div>
                    <p style={{ color: 'var(--muted)', fontSize: 13, lineHeight: 1.65, marginTop: 10 }}>Тёмное стекло, сетка и точная анимация. Учись по программе или блуждай свободно — прогресс хранится локально, без аккаунта.</p>
                    <div className="stats">
                      <div className="stat"><b>8</b><p>{t.statsCourses}</p></div>
                      <div className="stat"><b>28</b><p>{t.statsLessons}</p></div>
                      <div className="stat"><b>60+</b><p>{t.statsTopics}</p></div>
                      <div className="stat"><b>12h</b><p>{t.statsHours}</p></div>
                    </div>
                  </motion.div>
                </motion.div>

                <div className="section">
                  <motion.div className="section-head" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.28, duration: 0.4 }}><h2>{t.featuredCourses}</h2><p>Curated • Visual • Local progress</p></motion.div>
                  <motion.div className="cards" initial="initial" animate="animate" variants={stagger}>
                    <motion.div className="card" variants={cardMotion} whileHover={{ y: -4, scale: 1.01 }} whileTap={{ scale: 0.99 }} onClick={() => setView('study')} style={{ borderColor: 'rgba(124,92,252,0.22)', background: 'linear-gradient(135deg, rgba(124,92,252,0.12), rgba(255,255,255,0.015)), var(--surface)' }}>
                      <div className="card-top"><span className="badge" style={{ background: 'var(--purple)', color: 'white', borderColor: 'transparent', boxShadow: '0 6px 16px var(--purple-glow)' }}>Study Mode</span><span className="card-icon" style={{ background: 'rgba(124,92,252,0.16)', borderColor: 'rgba(124,92,252,0.24)', color: 'var(--purple2)' }}>◐</span></div>
                      <h3>{t.homeCardStudyTitle}</h3><p>{t.homeCardStudyDesc}</p>
                      <div className="card-meta"><div className="progress-track"><div className="progress-fill" style={{ width: '34%', background: 'var(--purple)' }} /></div><span className="card-cta" style={{ color: 'var(--purple2)' }}>{t.enterStudy} →</span></div>
                    </motion.div>
                    <motion.div className="card" variants={cardMotion} whileHover={{ y: -4, scale: 1.01 }} whileTap={{ scale: 0.99 }} onClick={() => setView('explore')}>
                      <div className="card-top"><span className="badge">Explore Mode</span><span className="card-icon">⬢</span></div>
                      <h3>{t.homeCardExploreTitle}</h3><p>{t.homeCardExploreDesc}</p>
                      <div className="card-meta"><div className="progress-track"><div className="progress-fill" style={{ width: '62%', background: 'var(--muted)' }} /></div><span className="card-cta">{t.enterExplore} →</span></div>
                    </motion.div>
                  </motion.div>
                </div>

                <div className="section">
                  <div className="section-head"><h2>{t.continueLearning}</h2><p>{courses.reduce((a, c) => a + progressFor(c), 0) / courses.length | 0}% {t.progress.toLowerCase()}</p></div>
                  <motion.div className="grid-courses" initial="initial" animate="animate" variants={stagger}>
                    {courses.slice(0, 2).map(c => (
                      <motion.div key={c.id} className="card" variants={cardMotion} whileHover={{ y: -4 }} onClick={() => navigateToLesson(c.id, c.lessons[0].id)}>
                        <div className="card-top"><span className="badge" style={{ borderColor: 'rgba(124,92,252,0.22)', color: 'var(--purple2)' }}>{c.level}</span><span className="card-icon" style={{ background: 'rgba(124,92,252,0.14)', color: 'var(--purple2)' }}>{c.image}</span></div>
                        <h3>{c.title[lang]}</h3><p>{c.desc[lang]}</p>
                        <div className="card-meta"><div className="progress-track"><div className="progress-fill" style={{ width: `${progressFor(c)}%`, background: 'var(--purple)' }} /></div><span style={{ fontSize: 11, color: 'var(--muted)', fontWeight: 700 }}>{progressFor(c)}%</span></div>
                      </motion.div>
                    ))}
                  </motion.div>
                  <p style={{ marginTop: 18, fontSize: 11, color: 'var(--muted2)', letterSpacing: '0.06em' }}>{t.footerMotto}</p>
                </div>
              </motion.div>
            )}

            {view === 'study' && (
              <motion.div key="study" {...pageMotion}>
                <div style={{ padding: '26px 32px 0' }}>
                  <div className="kicker" style={{ color: 'var(--purple2)' }}>Study Mode • {t.studyDesc}</div>
                  <h1 style={{ fontFamily: 'Space Grotesk', fontSize: 30, letterSpacing: -0.8, marginTop: 8, lineHeight: 1.15 }}>{t.studyHeading}</h1>
                  <p style={{ color: 'var(--muted)', fontSize: 13.5, marginTop: 8, lineHeight: 1.6 }}>{t.studyDesc}</p>
                </div>
                <div className="section">
                  <motion.div className="grid-courses" initial="initial" animate="animate" variants={stagger}>
                    {courses.map(c => {
                      const pct = progressFor(c)
                      return (
                        <motion.div key={c.id} className="card" variants={cardMotion} whileHover={{ y: -4, scale: 1.01 }} whileTap={{ scale: 0.99 }} onClick={() => navigateToLesson(c.id, c.lessons.find(l => !completed[c.id + ':' + l.id])?.id || c.lessons[0].id)}>
                          <div className="card-top"><span className="badge" style={{ color: 'var(--purple2)', borderColor: 'rgba(124,92,252,0.18)' }}>{c.level}</span><span className="card-icon" style={{ background: 'rgba(124,92,252,0.12)', color: 'var(--purple2)' }}>{c.image}</span></div>
                          <h3>{c.title[lang]}</h3><p>{c.desc[lang]}</p>
                          <div style={{ display: 'flex', gap: 6, marginTop: 14, flexWrap: 'wrap' }}>
                            {c.lessons.map(l => (
                              <span key={l.id} style={{ width: 23, height: 23, borderRadius: 999, display: 'grid', placeItems: 'center', fontSize: 10, fontWeight: 700, background: completed[c.id + ':' + l.id] ? 'var(--purple)' : 'rgba(255,255,255,0.06)', color: completed[c.id + ':' + l.id] ? 'white' : 'var(--muted)', border: '1px solid ' + (completed[c.id + ':' + l.id] ? 'transparent' : 'var(--border)'), boxShadow: completed[c.id + ':' + l.id] ? '0 4px 10px var(--purple-glow)' : 'none' }}>{completed[c.id + ':' + l.id] ? '✓' : '·'}</span>
                            ))}
                            <span style={{ fontSize: 11, color: 'var(--muted)', alignSelf: 'center', marginLeft: 6, fontWeight: 600 }}>{c.lessonsCount} {t.lessons} • {pct}%</span>
                          </div>
                          <div className="card-meta"><div className="progress-track"><div className="progress-fill" style={{ width: `${pct}%`, background: 'var(--purple)' }} /></div><span className="card-cta" style={{ color: 'var(--purple2)' }}>{pct ? t.resume : t.startCourse} →</span></div>
                        </motion.div>
                      )
                    })}
                  </motion.div>
                </div>
              </motion.div>
            )}

            {view === 'explore' && (
              <motion.div key="explore" {...pageMotion}>
                <div style={{ padding: '26px 32px 0' }}>
                  <h1 style={{ fontFamily: 'Space Grotesk', fontSize: 30, letterSpacing: -0.8, lineHeight: 1.15 }}>{t.exploreHeading}</h1>
                  <p style={{ color: 'var(--muted)', fontSize: 13.5, marginTop: 8, lineHeight: 1.6 }}>{t.exploreDesc}</p>
                  <div className="chips" style={{ marginTop: 16 }}>
                    {(['all', 'styles', 'structures', 'materials', 'engineering'] as const).map(cat => (
                      <button key={cat} className={`chip ${filter === cat ? 'active' : ''}`} onClick={() => setFilter(cat as any)}>
                        {cat === 'all' ? t.all : t[cat as Category]}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="section">
                  <motion.div className="topic-grid" initial="initial" animate="animate" variants={stagger}>
                    {filteredTopics.map(tp => (
                      <motion.div key={tp.id} className="topic-card" variants={cardMotion} whileHover={{ y: -4, scale: 1.01 }} whileTap={{ scale: 0.99 }} onClick={() => { setSelectedTopicId(tp.id); setView('topic') }}>
                        <div className="topic-emoji">{tp.image}</div>
                        <h4>{tp.title[lang]}</h4>
                        <p>{tp.desc[lang]}</p>
                        <div className="topic-meta"><span className="pill">{tp.category}</span><span className="pill">{tp.readTime}</span><span className="pill" style={{ color: 'var(--purple2)', borderColor: 'rgba(124,92,252,0.22)' }}>{tp.level}</span></div>
                      </motion.div>
                    ))}
                  </motion.div>
                  {filteredTopics.length === 0 && <p style={{ color: 'var(--muted)', marginTop: 18 }}>No results for “{search}”</p>}
                </div>
              </motion.div>
            )}

            {view === 'lesson' && selectedCourse && selectedLesson && (
              <motion.div key="lesson" {...pageMotion}>
                <div className="lesson-layout">
                  <motion.div className="lesson-nav" initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.4, delay: 0.08 }}>
                    <button className="btn-ghost" style={{ width: '100%', marginBottom: 14, justifyContent: 'center' }} onClick={() => setView('study')}>← {t.backToStudy}</button>
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
                    <div style={{ marginTop: 14, padding: 12, borderRadius: 14, background: 'rgba(124,92,252,0.08)', border: '1px solid rgba(124,92,252,0.16)', fontSize: 11.5, color: 'var(--muted)', lineHeight: 1.55 }}>
                      {t.progress}: <b style={{ color: 'var(--purple2)' }}>{progressFor(selectedCourse)}%</b><div className="progress-track" style={{ marginTop: 10 }}><div className="progress-fill" style={{ width: `${progressFor(selectedCourse)}%`, background: 'var(--purple)' }} /></div>
                    </div>
                  </motion.div>

                  <motion.div className="lesson-content" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.44, delay: 0.12 }}>
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
                        return <motion.button key={i} className={cls} onClick={() => setQuizAnswer(i)} whileTap={{ scale: 0.98 }}>{opt}</motion.button>
                      })}
                      {quizAnswer !== null && (
                        <motion.div initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} className={`quiz-feedback ${quizAnswer === selectedLesson.quiz.correct ? 'ok' : 'bad'}`}>
                          {quizAnswer === selectedLesson.quiz.correct ? `✓ ${t.quizCorrect}` : `✕ ${t.quizWrong}`}
                        </motion.div>
                      )}
                    </div>

                    <div className="lesson-actions">
                      {selectedCourse.lessons.findIndex(l => l.id === selectedLessonId) > 0 && (
                        <button className="btn-ghost" onClick={() => {
                          const idx = selectedCourse.lessons.findIndex(l => l.id === selectedLessonId)
                          setSelectedLessonId(selectedCourse.lessons[idx - 1].id); setQuizAnswer(null)
                        }}>{t.prevLesson}</button>
                      )}
                      <motion.button
                        className="btn-primary"
                        style={{ background: completed[selectedCourse.id + ':' + selectedLessonId] ? 'var(--surface3)' : undefined, color: completed[selectedCourse.id + ':' + selectedLessonId] ? 'var(--text)' : undefined, borderColor: completed[selectedCourse.id + ':' + selectedLessonId] ? 'var(--border2)' : undefined, boxShadow: completed[selectedCourse.id + ':' + selectedLessonId] ? 'none' : undefined }}
                        onClick={() => setCompleted(c => ({ ...c, [selectedCourse.id + ':' + selectedLessonId]: !c[selectedCourse.id + ':' + selectedLessonId] }))}
                        whileTap={{ scale: 0.97 }}
                      >
                        {completed[selectedCourse.id + ':' + selectedLessonId] ? `✓ ${t.completed}` : t.complete}
                      </motion.button>
                      {(() => {
                        const idx = selectedCourse.lessons.findIndex(l => l.id === selectedLessonId)
                        if (idx < selectedCourse.lessons.length - 1) {
                          return <button className="btn-primary" style={{ marginLeft: 'auto' }} onClick={() => { setSelectedLessonId(selectedCourse.lessons[idx + 1].id); setQuizAnswer(null) }}>{t.nextLesson} →</button>
                        }
                        return <button className="btn-ghost" style={{ marginLeft: 'auto' }} onClick={() => setView('study')}>{t.backToStudy}</button>
                      })()}
                    </div>
                  </motion.div>
                </div>
              </motion.div>
            )}

            {view === 'topic' && selectedTopic && (
              <motion.div key="topic" {...pageMotion} className="detail-page">
                <button className="btn-ghost" onClick={() => setView('explore')}>← {t.backToExplore}</button>
                <motion.div className="detail-card" style={{ marginTop: 16 }} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.08, duration: 0.42 }}>
                  <div style={{ fontSize: 38 }}>{selectedTopic.image}</div>
                  <div className="kicker" style={{ marginTop: 12, color: 'var(--purple2)' }}>{selectedTopic.category} • {selectedTopic.readTime} • {selectedTopic.level}</div>
                  <h2>{selectedTopic.title[lang]}</h2>
                  <p className="lead">{selectedTopic.desc[lang]}</p>
                  <article>
                    {selectedTopic.content.map((c, i) => <p key={i}>{(c as any)[lang]}</p>)}
                    <p style={{ color: 'var(--muted2)', fontSize: 12, borderTop: '1px solid var(--border)', paddingTop: 14, marginTop: 18, lineHeight: 1.6 }}>
                      AXIOM note — this is mock educational content. Real articles will include sections, diagrams and linked lessons.
                    </p>
                  </article>
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  )
}
