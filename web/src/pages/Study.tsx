import { useState } from "react";
import { useUi } from "@/store/ui";
import { useStudy, lessonKey } from "@/store/study";
import { STR } from "@/i18n";
import { courses, totalLessons } from "@/data/content";
import { Caption } from "@/components/Caption";
import { TreeHead } from "@/components/TreeHead";
import { LessonRow } from "@/components/LessonRow";
import { QuizOpt } from "@/components/QuizOpt";
import { Button } from "@/components/Button";
import { SegTab } from "@/components/SegTab";
import { AiChat } from "@/components/ai/AiChat";
import "./Study.css";

function Reader() {
  const lang = useUi((s) => s.lang);
  const s = STR[lang];
  const courseIdx = useStudy((st) => st.course);
  const lessonIdx = useStudy((st) => st.lesson);
  const picked = useStudy((st) => st.picked);
  const answer = useStudy((st) => st.answer);
  const setView = useUi((st) => st.setView);

  const course = courses[courseIdx];
  const lesson = course.lessons[lessonIdx];
  const body = lesson.body[lang];
  const q = lesson.quiz.q[lang];
  const opts = lesson.quiz.opts[lang];
  const revealed = picked >= 0;

  return (
    <div className="reader">
      <div className="reader__crumb mono">
        {course.id} / {String(lessonIdx + 1).padStart(2, "0")}
      </div>
      <h1 className="reader__title">{lesson.title[lang]}</h1>
      <div className="reader__meta mono">
        {lesson.duration} · {lesson.level}
      </div>
      <div className="reader__gap" />
      {body.map((p, i) => (
        <p key={i} className={i === 0 ? "reader__body1" : "reader__body2"}>
          {p}
        </p>
      ))}
      <div className="reader__gap-lg" />
      <Caption text={s.checkQuiz} />
      <div className="reader__gap-sm" />
      <div className="reader__quiz-q">{q}</div>
      <div className="reader__gap-sm" />
      <QuizOpt
        text={opts[0]}
        picked={picked === 0}
        right={lesson.quiz.correct === 0}
        revealed={revealed}
        onClick={() => answer(0, lesson.quiz.correct, lessonKey(course.id, lesson.id))}
      />
      <QuizOpt
        text={opts[1]}
        picked={picked === 1}
        right={lesson.quiz.correct === 1}
        revealed={revealed}
        onClick={() => answer(1, lesson.quiz.correct, lessonKey(course.id, lesson.id))}
      />
      {revealed && (
        <div className={`reader__fb mono ${picked === lesson.quiz.correct ? "reader__fb--ok" : "reader__fb--no"}`}>
          {picked === lesson.quiz.correct ? s.quizOk : s.quizNo}
        </div>
      )}
      <div className="reader__gap-lg" />
      <div className="reader__practice">
        <Button kind="primary" onClick={() => setView("studio")}>
          {s.practiceInStudio}
        </Button>
      </div>
    </div>
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

  const done = courses.reduce((acc, c) => {
    const k = c.lessons.filter((l) => completed[lessonKey(c.id, l.id)]).length;
    return acc + k;
  }, 0);
  const pct = totalLessons() === 0 ? 0 : Math.round((done / totalLessons()) * 100);

  return (
    <div className="page study">
      <aside className="study-tree">
        <div className="study-tree__inner">
          <div className="study-tree__head">
            <Caption text={s.courses} />
          </div>
          {courses.map((c, ci) => (
            <div key={c.id}>
              <TreeHead
                text={c.title[lang]}
                meta={c.meta[lang]}
                accent={c.accent}
                active={courseIdx === ci}
                onClick={() => selectCourse(ci)}
              />
              {courseIdx === ci && (
                <div className="study-tree__lessons">
                  {c.lessons.map((l, li) => (
                    <LessonRow
                      key={l.id}
                      num={String(li + 1).padStart(2, "0")}
                      text={l.title[lang]}
                      dur={l.duration.replace(" min", "m")}
                      active={lessonIdx === li}
                      done={completed[lessonKey(c.id, l.id)]}
                      onClick={() => selectLesson(li)}
                    />
                  ))}
                </div>
              )}
            </div>
          ))}
          <div className="study-tree__fill" />
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
              <Caption text={s.progress} />
              <div className="study-rail__pct">{pct}%</div>
              <div className="study-rail__bar">
                <div className="study-rail__bar-fill" style={{ width: `${pct}%` }} />
              </div>
              <div className="study-rail__meta mono">
                {done} of {totalLessons()} · {s.local}
              </div>
              <div className="study-rail__gap" />
              <Caption text={s.tracks} />
              {courses.map((c) => {
                const trackDone = c.lessons.filter((l) => completed[lessonKey(c.id, l.id)]).length;
                const all = trackDone === c.lessons.length;
                const any = trackDone > 0;
                const sym = all ? "✓" : any ? "◐" : "○";
                const label = `${sym} ${c.title[lang].split(" — ")[0].split(" (")[0]}`;
                const count = all || !any ? "" : ` ${trackDone}/${c.lessons.length}`;
                return (
                  <div
                    key={c.id}
                    className={`study-rail__track ${all ? "study-rail__track--done" : any ? "" : "study-rail__track--idle"}`}
                  >
                    {label}
                    <span className="study-rail__track-count mono">{count}</span>
                  </div>
                );
              })}
              <div className="study-rail__gap" />
              <Caption text={s.actions} />
              <div className="study-rail__action">
                <Button kind="primary" onClick={() => useUi.getState().setView("studio")}>
                  {s.practiceInStudio}
                </Button>
              </div>
            </div>
          )}
        </div>
      </aside>
    </div>
  );
}