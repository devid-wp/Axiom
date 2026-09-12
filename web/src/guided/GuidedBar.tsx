import { useEffect } from "react";
import { useUi } from "@/store/ui";
import { useTutor } from "@/ai/service";
import { KIND_LABELS } from "@/studio/domain";
import { FOUNDATION_LESSON_ID } from "./lessons";
import { useGuided } from "./store";
import "./GuidedBar.css";

const KIND_RU: Record<string, string> = {
  building: "здание",
  floor: "этаж",
  room: "комната",
  corridor: "коридор",
  wall: "стена",
  door: "дверь",
  window: "окно",
  roof: "крыша",
  column: "колонна",
  beam: "балка",
};

const T = {
  step: { en: "STEP", ru: "ШАГ" },
  showDemo: { en: "Show demo", ru: "Показать" },
  showAgain: { en: "Show again", ru: "Ещё раз" },
  myTurn: { en: "My turn", ru: "Моя очередь" },
  hint: { en: "Hint", ru: "Подсказка" },
  cont: { en: "Continue", ru: "Дальше" },
  finish: { en: "Finish", ru: "Готово" },
  exit: { en: "Exit guided", ru: "Выйти" },
  restart: { en: "Restart", ru: "Заново" },
  done: { en: "Track complete — Building → Floor → Room built.", ru: "Трек пройден — здание → этаж → комната построены." },
  where: { en: "expected", ru: "где" },
  root: { en: "project root", ru: "корень проекта" },
  demoFlash: { en: "Demo — watch, then press My turn.", ru: "Демо — смотрите, затем нажмите «Моя очередь»." },
  free: { en: "Free", ru: "Свободно" },
  guided: { en: "Guided", ru: "Гид" },
} as const;

type Key = keyof typeof T;

function tx(lang: "en" | "ru", key: Key): string {
  return T[key][lang];
}

export function ModePill() {
  const lang = useUi((s) => s.lang);
  const active = useGuided((g) => g.activeLesson !== null);
  const start = useGuided((g) => g.start);
  const exit = useGuided((g) => g.exit);
  return (
    <span className="mode-pill mono" title="Studio mode">
      <button
        className={active ? "mode-pill__btn" : "mode-pill__btn mode-pill__btn--on"}
        onClick={exit}
      >
        ● {tx(lang, "free")}
      </button>
      <button
        className={active ? "mode-pill__btn mode-pill__btn--on" : "mode-pill__btn"}
        onClick={() => start(FOUNDATION_LESSON_ID)}
      >
        ● {tx(lang, "guided")}
      </button>
    </span>
  );
}

export function GuidedBar() {
  const lang = useUi((s) => s.lang);
  const lesson = useGuided((g) => g.activeLesson);
  const stepIndex = useGuided((g) => g.stepIndex);
  const phase = useGuided((g) => g.phase);
  const validated = useGuided((g) => g.validated);
  const feedback = useGuided((g) => g.feedback);
  const demoError = useGuided((g) => g.demoError);
  const lastDemoIds = useGuided((g) => g.lastDemoIds);
  const done = useGuided((g) => g.done);
  const showDemo = useGuided((g) => g.showDemo);
  const myTurn = useGuided((g) => g.myTurn);
  const showAgain = useGuided((g) => g.showAgain);
  const revealHint = useGuided((g) => g.revealHint);
  const next = useGuided((g) => g.next);
  const start = useGuided((g) => g.start);
  const exit = useGuided((g) => g.exit);

  // Flash the demo result with the EXISTING action-flash mechanism.
  useEffect(() => {
    if (phase === "demo" && lastDemoIds.length > 0) {
      useTutor.getState().setFlash({
        summary: tx(lang, "demoFlash"),
        ids: lastDemoIds,
        stamp: Date.now(),
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase]);

  if (!lesson) return null;
  const step = lesson.steps[stepIndex];
  if (!step && phase !== "done") return null;
  const isLast = stepIndex >= lesson.steps.length - 1;

  const ctxWant = step?.expect.context;
  const ctxLine =
    phase === "done"
      ? ""
      : ctxWant === "root" || ctxWant === undefined
        ? `${tx(lang, "where")}: ${tx(lang, "root")}`
        : `${tx(lang, "where")}: ${lang === "ru" ? KIND_RU[ctxWant] ?? ctxWant : KIND_LABELS[ctxWant as keyof typeof KIND_LABELS] ?? ctxWant}`;

  return (
    <div className="guided-bar" data-phase={phase}>
      <span className="guided-bar__step mono">
        {phase === "done" ? "✓" : `${tx(lang, "step")} ${stepIndex + 1}/${lesson.steps.length}`}
      </span>
      <div className="guided-bar__body">
        <div className="guided-bar__title">{lesson.title[lang]}</div>
        {phase === "done" ? (
          <div className="guided-bar__instruction">{tx(lang, "done")}</div>
        ) : (
          step && (
            <>
              <div className="guided-bar__instruction">{step.instruction[lang]}</div>
              <div className="guided-bar__ctx mono">{ctxLine}</div>
            </>
          )
        )}
        {feedback && <div className="guided-bar__feedback">{feedback[lang]}</div>}
        {demoError && <div className="guided-bar__error">{demoError}</div>}
      </div>
      <div className="guided-bar__actions">
        {phase === "brief" && (
          <>
            <button className="guided-bar__btn" onClick={showDemo}>{tx(lang, "showDemo")}</button>
            <button className="guided-bar__btn guided-bar__btn--primary" onClick={myTurn}>{tx(lang, "myTurn")}</button>
          </>
        )}
        {phase === "demo" && (
          <>
            <button className="guided-bar__btn" onClick={showAgain}>{tx(lang, "showAgain")}</button>
            <button className="guided-bar__btn guided-bar__btn--primary" onClick={myTurn}>{tx(lang, "myTurn")}</button>
          </>
        )}
        {phase === "student" && (
          <>
            <button className="guided-bar__btn" onClick={revealHint}>{tx(lang, "hint")}</button>
            <button className="guided-bar__btn" onClick={showAgain}>{tx(lang, "showAgain")}</button>
            <button
              className="guided-bar__btn guided-bar__btn--primary"
              onClick={next}
              disabled={!validated}
              title={validated ? "" : step?.hint[lang]}
            >
              {isLast ? tx(lang, "finish") : tx(lang, "cont")}
            </button>
          </>
        )}
        {phase === "done" && (
          <>
            <button className="guided-bar__btn" onClick={() => lesson && start(lesson.id)} disabled={!lesson}>
              {tx(lang, "restart")}
            </button>
            <button className="guided-bar__btn" onClick={exit}>{tx(lang, "exit")}</button>
          </>
        )}
      </div>
      {phase !== "done" && done[lesson.id] && (
        <span className="guided-bar__badge mono" title={tx(lang, "done")}>✓</span>
      )}
    </div>
  );
}
