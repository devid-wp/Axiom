import { useState, useMemo } from "react";
import { useUi } from "@/store/ui";
import { useStudy, lessonKey } from "@/store/study";
import { STR } from "@/i18n";
import { courses as hardcodedCourses, totalLessons as hardcodedTotal } from "@/data/content";
import { mergeCourses } from "@/store/generated";
import { Caption } from "@/components/Caption";
import { TreeHead } from "@/components/TreeHead";
import { LessonRow } from "@/components/LessonRow";
import { QuizOpt } from "@/components/QuizOpt";
import { Button } from "@/components/Button";
import { SegTab } from "@/components/SegTab";
import { AiChat } from "@/components/ai/AiChat";
import { Sparkles, ArrowRight, Box, Check } from "lucide-react";
import "./Study.css";

function useMergedCourses() {
  return useMemo(() => mergeCourses(hardcodedCourses), []);
}

function totalLessonsFor(c: ReturnType<typeof useMergedCourses>) {
  return c.reduce((acc, cc) => acc + cc.lessons.length, 0);
}

function Reader() {
  const lang = useUi((s) => s.lang);
  const s = STR[lang];
  const courseIdx = useStudy((st) => st.course);
  const lessonIdx = useStudy((st) => st.lesson);
  const picked = useStudy((st) => st.picked);
  const answer = useStudy((st) => st.answer);
  const setView = useUi((st) => st.setView);
  const requestAi = useUi((st) => st.requestAi);
  const courses = useMergedCourses();

  const course = courses[courseIdx];
  const lesson = course.lessons[lessonIdx];
  const body = lesson.body[lang];
  const q = lesson.quiz.q[lang];
  const opts = lesson.quiz.opts[lang];
  const revealed = picked >= 0;

  return (
    <article className="reader">
      <div className="reader__crumb">
        <span className="reader__crumb-index mono">{course.id}</span>
        <span className="reader__crumb-sep">/</span>
        <span className="reader__crumb-lesson mono">{String(lessonIdx + 1).padStart(2, "0")}</span>
      </div>
      <h1 className="reader__title">{lesson.title[lang]}</h1>
      <div className="reader__meta mono">
        <span className="reader__meta-item">{lesson.duration}</span>
        <span className="reader__meta-dot" />
        <span className="reader__meta-item">{lesson.level}</span>
      </div>

      <div className="reader__body">
        <div className="reader__leading">{body[0]}</div>
        {body.slice(1).map((p, i) => (
          <p key={i} className="reader__paragraph">
            {p}
          </p>
        ))}
      </div>

      <div className="reader__quiz-block">
        <div className="reader__quiz-head">
          <span className="eyebrow eyebrow--noted">Knowledge check</span>
        </div>
        <div className="reader__quiz-q">{q}</div>
        <div className="reader__quiz-opts">
          {opts.map((text, i) => (
            <QuizOpt
              key={i}
              text={text}
              picked={picked === i}
              right={lesson.quiz.correct === i}
              revealed={revealed}
              onClick={() => answer(i, lesson.quiz.correct, lessonKey(course.id, lesson.id))}
            />
          ))}
        </div>
        {revealed && (
          <div className={`reader__fb ${picked === lesson.quiz.correct ? "reader__fb--ok" : "reader__fb--no"}`}>
            {picked === lesson.quiz.correct ? (
              <span className="reader__fb-icon"><Check size={13} /></span>
            ) : (
              <span className="reader__fb-icon reader__fb-icon--no">✕</span>
            )}
            <span className="mono">
              {picked === lesson.quiz.correct ? s.quizOk : s.quizNo}
            </span>
          </div>
        )}
      </div>

      <div className="reader__actions">
        <Button kind="primary" onClick={() => setView("studio")}>
          <Box size={13} />
          {s.practiceInStudio}
        </Button>
        <Button onClick={() => requestAi()}>
          <Sparkles size={13} />
          {s.explainThis}
        </Button>
      </div>
    </article>
  );
}

export function StudyPage() {
  const [railTab, setRailTab] = useState<"progress" | "ai">("progress");
  const lang = useUi((s) => s.lang);
  const s = STR[lang];
  const courseIdx = useStudy((st) => st.course);
  const lessonIdx = useStudy((st) => st.lesson);
  const completed = useStudy((st) => st.completed);
  const selectCourse = useStudy((st) => st.selectCourse);
  const selectLesson = useStudy((st) => st.selectLesson);
  const courses = useMergedCourses();
  const total = totalLessonsFor(courses);

  const done = courses.reduce((acc, c) => {
    const k = c.lessons.filter((l) => completed[lessonKey(c.id, l.id)]).length;
    return acc + k;
  }, 0);
  const pct = total === 0 ? 0 : Math.round((done / total) * 100);

  return (
    <div className="page study">
      <aside className="study-toc">
        <div className="study-toc__inner">
          <div className="study-toc__head">
            <span className="eyebrow">Curriculum</span>
          </div>
          <div className="study-toc__progress">
            <div className="study-toc__pct mono">{pct}%</div>
            <div className="study-toc__bar">
              <div className="study-toc__bar-fill" style={{ width: `${pct}%` }} />
            </div>
          </div>
          <div className="study-toc__courses">
            {courses.map((c, ci) => (
              <div key={c.id} className="study-toc__course">
                <TreeHead
                  text={c.title[lang]}
                  meta={c.meta[lang]}
                  accent={c.accent}
                  active={courseIdx === ci}
                  onClick={() => selectCourse(ci)}
                />
                {courseIdx === ci && (
                  <div className="study-toc__lessons">
                    {c.lessons.map((l, li) => (
                      <LessonRow
                        key={l.id}
                        num={String(li + 1).padStart(2, "0")}
                        text={l.title[lang]}
                        dur={l.duration}
                        active={lessonIdx === li}
                        done={completed[lessonKey(c.id, l.id)]}
                        onClick={() => selectLesson(li)}
                      />
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
          <div className="study-toc__foot mono">
            {done} / {total} · {s.local}
          </div>
        </div>
      </aside>

      <div className="study-reader">
        <Reader />
      </div>

      <aside className={`study-rail ${railTab === "ai" ? "study-rail--ai" : ""}`}>
        <div className="study-rail__tabs">
          <SegTab text={s.progressTab} active={railTab === "progress"} onClick={() => setRailTab("progress")} />
          <SegTab text={s.aiTab} active={railTab === "ai"} onClick={() => setRailTab("ai")} />
        </div>
        <div className="study-rail__body">
          {railTab === "ai" ? (
            <AiChat scope="study" />
          ) : (
            <div className="study-rail__progress">
              <span className="eyebrow">Learning path</span>
              <div className="study-rail__head">
                <span className="study-rail__pct">{pct}%</span>
                <span className="study-rail__meta mono">{done} of {total}</span>
              </div>
              <div className="study-rail__bar">
                <div className="study-rail__bar-fill" style={{ width: `${pct}%` }} />
              </div>

              <div className="study-rail__gap" />
              <span className="eyebrow">Courses</span>
              {courses.map((c) => {
                const trackDone = c.lessons.filter((l) => completed[lessonKey(c.id, l.id)]).length;
                const all = trackDone === c.lessons.length;
                const any = trackDone > 0;
                const count = all || !any ? "" : ` ${trackDone}/${c.lessons.length}`;
                return (
                  <div
                    key={c.id}
                    className={`study-rail__course ${all ? "study-rail__course--done" : any ? "" : "study-rail__course--idle"}`}
                  >
                    <span className="study-rail__course-dot" style={{ background: c.accent }} />
                    <span className="study-rail__course-name">{c.title[lang].split(" — ")[0].split(" (")[0]}</span>
                    <span className="study-rail__course-count mono">{count}</span>
                  </div>
                );
              })}

              <div className="study-rail__gap" />
              <span className="eyebrow">Actions</span>
              <div className="study-rail__action">
                <Button kind="primary" onClick={() => useUi.getState().setView("studio")}>
                  {s.practiceInStudio} <ArrowRight size={13} />
                </Button>
              </div>

              <div className="study-rail__gap" />
              <span className="eyebrow">Tutor</span>
              <button className="study-rail__ai" onClick={() => setRailTab("ai")}>
                <Sparkles size={14} />
                <span>{s.askTutor}</span>
              </button>
            </div>
          )}
        </div>
      </aside>
    </div>
  );
}
