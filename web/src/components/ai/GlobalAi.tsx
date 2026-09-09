/* AXIOM — global AI corner window. Lives above every page at the shell level. */

import { useEffect, useRef, useState } from "react";
import type { PointerEvent as ReactPointerEvent } from "react";
import { useUi } from "@/store/ui";
import { useTutor } from "@/ai/service";
import { STR } from "@/i18n";
import { AiChat } from "./AiChat";
import { Sparkles } from "lucide-react";
import "./global-ai.css";

const HOME_W = 400;
const HOME_H = 560;
const MIN_W = 320;
const MIN_H = 380;

export function GlobalAi() {
  const lang = useUi((s) => s.lang);
  const view = useUi((s) => s.view);
  const open = useUi((s) => s.aiPanel);
  const openPanel = useUi((s) => s.openAiPanel);
  const closePanel = useUi((s) => s.closeAiPanel);
  const aiRequest = useUi((s) => s.aiRequest);
  const consumeAiRequest = useUi((s) => s.consumeAiRequest);
  const mode = useTutor((s) => s.mode);

  const s = STR[lang];

  const [size, setSize] = useState({ w: HOME_W, h: HOME_H });
  const drag = useRef<{ sx: number; sy: number; w: number; h: number } | null>(null);

  useEffect(() => {
    if (aiRequest > 0) {
      consumeAiRequest();
      openPanel();
    }
  }, [aiRequest, consumeAiRequest, openPanel]);

  if (!open) {
    return (
      <button className="g-ai-fab mono" onClick={openPanel} title={s.aiOpen}>
        <span className="g-ai-fab__glyph"><Sparkles size={13} /></span>
        <span className={`g-ai-fab__live-dot${mode === "live" ? " g-ai-fab__live-dot--on" : ""}`} aria-hidden />
        <span>{s.aiTab}</span>
      </button>
    );
  }

  const scope = view === "study" ? "study" : "studio";

  const startResize = (e: ReactPointerEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.currentTarget.setPointerCapture(e.pointerId);
    drag.current = { sx: e.clientX, sy: e.clientY, w: size.w, h: size.h };
  };

  const onResizeMove = (e: ReactPointerEvent<HTMLDivElement>) => {
    const d = drag.current;
    if (!d) return;
    const maxW = Math.max(window.innerWidth - 80, MIN_W);
    const maxH = Math.max(window.innerHeight - 60, MIN_H);
    setSize({
      w: Math.min(Math.max(d.w + (e.clientX - d.sx), MIN_W), maxW),
      h: Math.min(Math.max(d.h + (e.clientY - d.sy), MIN_H), maxH),
    });
  };

  const stopResize = () => {
    drag.current = null;
  };

  return (
    <div className="g-ai" role="dialog" aria-label={s.aiTutor} style={{ width: size.w, height: size.h }}>
      <div className="g-ai__frame" aria-hidden />
      <AiChat scope={scope} onClose={closePanel} />
      <div
        className="g-ai__resize"
        onPointerDown={startResize}
        onPointerMove={onResizeMove}
        onPointerUp={stopResize}
        title={s.aiResize}
        aria-hidden
      >
        <i />
        <i />
        <i />
      </div>
    </div>
  );
}
