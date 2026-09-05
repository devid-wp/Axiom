import { useEffect, useMemo, useRef, useState } from "react";
import { useUi } from "@/store/ui";
import { useStudio } from "@/store/studio";
import { useStudy, lessonKey } from "@/store/study";
import { courses } from "@/data/content";
import { useTutor, startExerciseFromMessage } from "@/ai/service";
import { studySuggestions, studioSuggestions, type Suggestion } from "@/ai/suggestions";
import { buildStudioContext, buildStudyContext } from "@/ai/prompts";
import { STR } from "@/i18n";
import { Caption } from "@/components/Caption";
import "./ai.css";

export interface AiChatProps {
  scope: "study" | "studio";
  onClose?: () => void;
}

function useScopeCtx(scope: AiChatProps["scope"]) {
  const lang = useUi((s) => s.lang);
  const selectedId = useStudio((s) => s.selectedId);
  const project = useStudio((s) => s.projects[s.currentIdx]);
  const exercise = useTutor((s) => s.exercise);
  return useMemo(() => {
    if (scope === "study") return buildStudyContext();
    void lang;
    void selectedId;
    void project;
    return buildStudioContext(exercise);
  }, [scope, lang, selectedId, project, exercise]);
}

export function AiChat({ scope, onClose }: AiChatProps) {
  const lang = useUi((s) => s.lang);
  const s = STR[lang];
  const [input, setInput] = useState("");
  const msgsRef = useRef<HTMLDivElement>(null);

  const session = useTutor((st) => st.sessions[scope]);
  const mode = useTutor((st) => st.mode);
  const exercise = useTutor((st) => st.exercise);
  const ask = useTutor((st) => st.ask);
  const retry = useTutor((st) => st.retry);
  const clear = useTutor((st) => st.clear);
  const confirmPending = useTutor((st) => st.confirmPending);
  const cancelPending = useTutor((st) => st.cancelPending);
  const clearExercise = useTutor((st) => st.clearExercise);

  const ctx = useScopeCtx(scope);
  const suggestions: Suggestion[] = useMemo(
    () => (scope === "study" ? studySuggestions(lang) : studioSuggestions(ctx)),
    [scope, lang, ctx]
  );

  const thinking = session.status === "thinking";
  const modeLabel = mode === "live" ? s.aiLive : mode === "mock" ? s.aiOffline : "";

  useEffect(() => {
    const el = msgsRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [session.messages.length, thinking, session.pending]);

  const submit = (text: string) => {
    const q = text.trim();
    if (!q || thinking) return;
    setInput("");
    void ask(scope, q);
  };

  const undo = () => useStudio.getState().undo();

  /* ---- visible context --------------------------------------------------- */
  let ctxLabel = "";
  let ctxMeta = "";
  if (scope === "studio") {
    const st = useStudio.getState();
    const proj = st.projects[st.currentIdx];
    ctxLabel = proj?.name ? `${s.aiScopeStudio} · ${proj.name}` : s.aiScopeStudio;
    ctxMeta = `${proj?.elements.length ?? 0} ${s.elements}`;
    if (st.selectedId && proj?.elements.some((e) => e.id === st.selectedId)) ctxMeta += ` · 1 ${s.ctxSel}`;
  } else {
    const st = useStudy.getState();
    const c = courses[st.course];
    const l = c?.lessons[st.lesson];
    ctxLabel = l ? `${c.title[lang].split(" — ")[0].split(" (")[0]} · ${l.title[lang]}` : s.aiScopeStudy;
    ctxMeta = `L${String(st.lesson + 1).padStart(2, "0")}${l ? ` · ${l.level}` : ""}`;
  }

  return (
    <div className={`ai ai--${scope}`}>
      <div className="ai__head">
        <div className="ai__brand">
          <span className="ai__brand-title">AXIOM AI</span>
          <span className="ai__brand-sub">{s.aiRole}</span>
        </div>
        <span className="ai__mode">
          <span className={`ai__dot ${mode === "live" ? "ai__dot--live" : "ai__dot--off"}`} />
          {modeLabel}
        </span>
        <span className="ai__spacer" />
        {session.messages.length > 0 && (
          <button className="ai__clear mono" onClick={() => clear(scope)}>
            {s.aiClear}
          </button>
        )}
        {onClose && (
          <button className="ai__close" onClick={onClose} aria-label="Close">
            ×
          </button>
        )}
      </div>

      <div className="ai__ctx" title={ctxLabel}>
        <span className="ai__ctx-k mono">{s.aiContext}</span>
        <span className="ai__ctx-body">{ctxLabel}</span>
        <span className="ai__ctx-meta mono">{ctxMeta}</span>
      </div>

      {exercise && (
        <div className="ai__exercise">
          <div className="ai__exercise-label">{s.aiChallenge}</div>
          <div className="ai__exercise-title">{exercise.title}</div>
          <div className="ai__exercise-info">{exercise.instructions}</div>
          <button className="ai__exercise-x" onClick={clearExercise} aria-label="Clear challenge">
            ×
          </button>
        </div>
      )}

      <div className="ai__suggest">
        <Caption text={s.aiSuggs} />
        <div className="ai__chips">
          {suggestions.slice(0, 5).map((sg, i) => (
            <button key={i} className="ai__chip mono" onClick={() => submit(sg.question)}>
              {sg.label}
            </button>
          ))}
        </div>
      </div>

      <div className="ai__msgs" ref={msgsRef}>
        {session.messages.length === 0 && (
          <div className="ai__pick">
            <div className="ai__pick-q">{scope === "study" ? s.aiEmptyStudyTitle : s.aiEmptyStudioTitle}</div>
            <p className="ai__pick-hint">{scope === "study" ? s.aiEmptyStudy : s.aiEmptyStudio}</p>
            <div className="ai__pick-list">
              {suggestions.slice(0, 3).map((sg, i) => (
                <button key={i} className="ai__pick-row" onClick={() => submit(sg.question)}>
                  <span className="ai__pick-arrow mono">{"\u2192"}</span>
                  <span>{sg.label}</span>
                </button>
              ))}
            </div>
          </div>
        )}
        {session.messages.map((m, i) => (
          <div key={i} className={`ai__msg ai__msg--${m.role}`}>
            {m.content.split("\n").map((line, j) => (
              <p key={j}>{line || "\u00A0"}</p>
            ))}

            {m.exercise && (
              <div className="ai__offer">
                <div className="ai__offer-title">{m.exercise.title}</div>
                {m.exercise.objective && (
                  <div className="ai__offer-line">
                    <span className="ai__offer-label">{s.aiObjective}</span>
                    {m.exercise.objective}
                  </div>
                )}
                <div className="ai__offer-line">
                  <span className="ai__offer-label">{s.aiTask}</span>
                  {m.exercise.task}
                </div>
                {m.exercise.hint && (
                  <div className="ai__offer-line">
                    <span className="ai__offer-label">{s.aiHint}</span>
                    {m.exercise.hint}
                  </div>
                )}
                <button className="ai__practice" onClick={() => startExerciseFromMessage(scope, m.exercise!)}>
                  {s.aiPractice}
                </button>
              </div>
            )}

            {m.actions && m.actions.length > 0 && (
              <div className="ai__effects">
                <span className="ai__effects-line">
                  {"\u2713"} {m.actions.map((a) => a.summary).join(" · ")}
                </span>
                {m.actions.some((a) => a.undoable) && (
                  <button className="ai__effects-undo mono" onClick={undo}>
                    {s.aiUndo}
                  </button>
                )}
              </div>
            )}
          </div>
        ))}

        {session.pending && (
          <div className="ai__confirm">
            <div className="ai__confirm-note">
              {s.aiAskConfirm} {s.aiDangerNote}
            </div>
            <div className="ai__confirm-actions">
              <button className="ai__confirm-apply" onClick={() => void confirmPending(scope)}>
                {s.aiApply}
              </button>
              <button className="ai__confirm-cancel" onClick={() => cancelPending(scope)}>
                {s.aiCancel}
              </button>
            </div>
          </div>
        )}

        {thinking && (
          <div className="ai__thinking">
            <span className="ai__dots">
              <i />
              <i />
              <i />
            </span>
            {s.aiThinking}…
          </div>
        )}
        {session.status === "error" && (
          <div className="ai__error">
            {s.aiError}
            <button className="ai__retry mono" onClick={() => void retry(scope)}>
              {s.aiRetry}
            </button>
          </div>
        )}
      </div>

      <form
        className="ai__form"
        onSubmit={(e) => {
          e.preventDefault();
          submit(input);
        }}
      >
        <textarea
          className="ai__input"
          value={input}
          disabled={thinking}
          placeholder={s.aiPlaceholder}
          rows={1}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              submit(input);
            }
          }}
        />
        <button className="ai__send" type="submit" disabled={thinking || !input.trim()}>
          {"\u2192"}
        </button>
      </form>
    </div>
  );
}