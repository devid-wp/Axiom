import { useUi } from "@/store/ui";
import { useStudio } from "@/store/studio";
import { useStudy, lessonKey } from "@/store/study";
import { hasSeenWelcome } from "@/store/onboarding";
import { WelcomePage } from "./Welcome";
import { STR } from "@/i18n";
import { courses, totalLessons } from "@/data/content";
import { Compass, Box, BookOpen, Sparkles, ArrowRight, Play, Plus } from "lucide-react";
import "./Start.css";

interface NavCard {
  id: string;
  icon: React.ReactNode;
  title: string;
  sub: string;
  hint: string;
  onClick: () => void;
  accent?: boolean;
}

export function StartPage() {
  const lang = useUi((s) => s.lang);
  const s = STR[lang];
  const setView = useUi((s) => s.setView);
  const requestAi = useUi((s) => s.requestAi);
  const projects = useStudio((st) => st.projects);
  const currentIdx = useStudio((st) => st.currentIdx);
  const newProject = useStudio((st) => st.newProject);
  const openProject = useStudio((st) => st.openProject);
  const completed = useStudy((st) => st.completed);

  const current = projects[currentIdx];

  const done = courses.reduce((acc, c) => {
    const k = c.lessons.filter((l) => completed[lessonKey(c.id, l.id)]).length;
    return acc + k;
  }, 0);
  const total = totalLessons();
  const pct = total === 0 ? 0 : Math.round((done / total) * 100);

  const currentCourse = courses.find((c) =>
    c.lessons.some((l) => completed[lessonKey(c.id, l.id)])
  );

  // First launch: show the Welcome introduction instead of the dashboard.
  // Re-checked every render so returning to Start after onboarding is normal.
  if (!hasSeenWelcome()) return <WelcomePage />;

  const navCards: NavCard[] = [
    {
      id: "study",
      icon: <BookOpen size={16} />,
      title: s.continueStudy,
      sub: s.continueStudySub,
      hint: `${total - done} ${s.remaining}`,
      onClick: () => setView("study"),
    },
    {
      id: "explore",
      icon: <Compass size={16} />,
      title: s.browseTopics,
      sub: s.browseTopicsSub,
      hint: s.entriesCount,
      onClick: () => setView("explore"),
    },
    {
      id: "studio",
      icon: <Box size={16} />,
      title: s.openStudio,
      sub: s.openStudioSub,
      hint: current ? `${current.elements.length} ${s.elements}` : s.newProject,
      onClick: () => setView("studio"),
    },
  ];

  return (
    <div className="page start">
      <div className="start__scroll">
        <div className="start__column">
          {/* Masthead */}
          <div className="start__masthead">
            <div className="start__masthead-top">
              <span className="start__eyebrow eyebrow eyebrow--noted">Architecture Learning Platform</span>
            </div>
            <h1 className="start__title">{s.startTitle}</h1>
            <p className="start__subtitle">{s.startSubtitle}</p>
          </div>

          {/* Continue learning */}
          <section className="start__section">
            <div className="start__section-head">
              <span className="eyebrow">Continue learning</span>
              <span className="start__section-meta mono">on track</span>
            </div>
            <button
              className="start__continue"
              onClick={() => setView("study")}
            >
              <div className="start__continue-left">
                <span className="start__continue-play"><Play size={13} fill="currentColor" /></span>
                <div className="start__continue-body">
                  <span className="start__continue-kicker mono">{currentCourse ? currentCourse.title[lang].split(" — ")[0].split(" (")[0] : s.noCourse}</span>
                  <span className="start__continue-title">{s.resumeLesson}</span>
                </div>
              </div>
              <span className="start__continue-arrow"><ArrowRight size={15} /></span>
            </button>
          </section>

          {/* Progress */}
          <section className="start__section">
            <div className="start__section-head">
              <span className="eyebrow">Progress</span>
              <span className="start__section-meta mono">{pct}%</span>
            </div>
            <div className="start__progress">
              <div className="start__progress-bar">
                <div className="start__progress-fill" style={{ width: `${pct}%` }} />
              </div>
              <div className="start__progress-meta mono">
                {done} / {total} {s.lessonsTaken}
              </div>
              <div className="start__progress-tracks">
                {courses.map((c) => {
                  const trackDone = c.lessons.filter((l) => completed[lessonKey(c.id, l.id)]).length;
                  const trackPct = c.lessons.length ? Math.round((trackDone / c.lessons.length) * 100) : 0;
                  return (
                    <div className="start__track" key={c.id}>
                      <div className="start__track-info">
                        <span className="start__track-name">{c.title[lang].split(" — ")[0].split(" (")[0]}</span>
                        <span className="start__track-count mono">{trackDone}/{c.lessons.length}</span>
                      </div>
                      <div className="start__track-bar">
                        <div className="start__track-fill" style={{ width: `${trackPct}%` }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </section>

          {/* Explore */}
          <section className="start__section">
            <div className="start__section-head">
              <span className="eyebrow">Explore</span>
            </div>
            <div className="start__nav-grid">
              {navCards.map((card) => (
                <button
                  key={card.id}
                  className={`start__nav-card ${card.accent ? "start__nav-card--accent" : ""}`}
                  onClick={card.onClick}
                >
                  <span className="start__nav-icon">{card.icon}</span>
                  <span className="start__nav-text">
                    <span className="start__nav-title">{card.title}</span>
                    <span className="start__nav-sub">{card.sub}</span>
                  </span>
                  <span className="start__nav-hint mono">{card.hint}</span>
                  <span className="start__nav-arrow"><ArrowRight size={14} /></span>
                </button>
              ))}
            </div>
          </section>

          {/* AI Tutor */}
          <section className="start__section">
            <div className="start__section-head">
              <span className="eyebrow">AI Tutor</span>
              <span className="start__section-meta mono">always available</span>
            </div>
            <button className="start__ai" onClick={requestAi}>
              <span className="start__ai-icon"><Sparkles size={16} /></span>
              <span className="start__ai-body">
                <span className="start__ai-title">{s.aiAskCta}</span>
                <span className="start__ai-sub">{s.aiHomeHint}</span>
              </span>
              <span className="start__ai-open mono">{s.aiOpen}</span>
            </button>
          </section>

          {/* Recent projects */}
          {projects.length > 0 && (
            <section className="start__section">
              <div className="start__section-head">
                <span className="eyebrow">Recent projects</span>
              </div>
              <div className="start__recent">
                {projects.map((p, i) => (
                  <button
                    key={p.id}
                    className="start__recent-row"
                    onClick={() => {
                      openProject(i);
                      setView("studio");
                    }}
                  >
                    <span className="start__recent-icon"><Box size={14} /></span>
                    <span className="start__recent-name">{p.name}</span>
                    <span className="start__recent-meta mono">{p.elements.length} {s.elements}</span>
                    <span className="start__recent-arrow"><ArrowRight size={13} /></span>
                  </button>
                ))}
                <button className="start__recent-new" onClick={() => { newProject(); setView("studio"); }}>
                  <Plus size={14} />
                  <span>{s.newProject}</span>
                </button>
              </div>
            </section>
          )}

          <div className="start__spacer" />
          <div className="start__footer mono">{s.configLine}</div>
        </div>
      </div>
    </div>
  );
}
