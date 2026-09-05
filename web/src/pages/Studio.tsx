import { useEffect, useMemo, useRef, useState } from "react";
import { useUi } from "@/store/ui";
import { useStudio } from "@/store/studio";
import { STR } from "@/i18n";
import { Caption } from "@/components/Caption";
import { ToolButton } from "@/components/ToolButton";
import { TreeRow } from "@/components/TreeRow";
import { Inspector } from "@/components/Inspector";
import {
  GRID_STEP,
  KIND_LABELS,
  MATERIAL_COLORS,
  MATERIAL_LABELS,
  SHEET_H,
  SHEET_W,
  elementName,
} from "@/studio/domain";
import type { Element as StudioElement, Tool } from "@/studio/types";
import "./Studio.css";

interface ToolDef {
  t: Tool;
  icon: string;
  label: string;
  key?: string;
}

const NAV_TOOLS: ToolDef[] = [
  { t: "select", icon: "⌖", label: "Select", key: "V" },
  { t: "move", icon: "✥", label: "Move", key: "M" },
];

const BUILD_TOOLS: ToolDef[] = [
  { t: "wall", icon: "—", label: "Wall", key: "W" },
  { t: "room", icon: "▭", label: "Room", key: "R" },
  { t: "column", icon: "⬢", label: "Column", key: "C" },
  { t: "beam", icon: "━", label: "Beam", key: "B" },
];

const ELEMENT_LABELS: Record<StudioElement["kind"], string> = {
  room: "ROOM",
  wall: "WALL",
  column: "⬢",
  beam: "BEAM",
};

function Ruler({ width }: { width: number }) {
  const s = width / SHEET_W;
  const ticks = Array.from({ length: Math.floor(SHEET_W / GRID_STEP) + 1 }, (_, i) => i * GRID_STEP);
  const labels = [0, 4, 8, 12, 16, 20];
  return (
    <div className="ruler" style={{ width }}>
      {ticks.map((t) => (
        <span key={t} className="ruler__tick" style={{ left: t * s }} />
      ))}
      {labels.map((k) => (
        <span key={k} className="ruler__label mono" style={{ left: k * 176 * s + 3 * s }}>
          {k}
        </span>
      ))}
      <span className="ruler__edge" />
    </div>
  );
}

function Canvas() {
  const canvasClick = useStudio((s) => s.canvasClick);
  const hover = useStudio((s) => s.hover);
  const pressMove = useStudio((s) => s.pressMove);
  const dragMove = useStudio((s) => s.dragMove);
  const pressSize = useStudio((s) => s.pressSize);
  const dragSize = useStudio((s) => s.dragSize);
  const release = useStudio((s) => s.release);
  const tool = useStudio((s) => s.tool);
  const selectedId = useStudio((s) => s.selectedId);
  const elements = useStudio((s) => s.projects[s.currentIdx]?.elements ?? []);

  const zoneRef = useRef<HTMLDivElement>(null);
  const sheetRef = useRef<SVGSVGElement>(null);
  const [fit, setFit] = useState({ w: SHEET_W, h: SHEET_H, k: 1 });

  useEffect(() => {
    const zone = zoneRef.current;
    if (!zone) return;
    const measure = () => {
      const r = zone.getBoundingClientRect();
      const availW = Math.max(240, r.width - 64);
      const availH = Math.max(200, r.height - 64 - 16);
      const k = Math.min(availW / SHEET_W, availH / SHEET_H, 1);
      setFit({ w: Math.round(SHEET_W * k), h: Math.round(SHEET_H * k), k });
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(zone);
    return () => ro.disconnect();
  }, []);

  const toLogical = (e: { clientX: number; clientY: number }) => {
    const rect = sheetRef.current?.getBoundingClientRect();
    if (!rect || rect.width === 0) return { x: 0, y: 0 };
    return {
      x: ((e.clientX - rect.left) / rect.width) * SHEET_W,
      y: ((e.clientY - rect.top) / rect.height) * SHEET_H,
    };
  };

  const grab = (
    e: React.PointerEvent<SVGRectElement>,
    fn: (id: string, x: number, y: number) => void,
    id: string
  ) => {
    e.stopPropagation();
    try {
      (e.currentTarget as Element).setPointerCapture(e.pointerId);
    } catch {
      /* ignore */
    }
    const p = toLogical(e);
    fn(id, p.x, p.y);
  };

  const vLines = useMemo(
    () => Array.from({ length: Math.floor(SHEET_W / GRID_STEP) + 1 }, (_, i) => i * GRID_STEP),
    []
  );
  const hLines = useMemo(
    () => Array.from({ length: Math.floor(SHEET_H / GRID_STEP) + 1 }, (_, i) => i * GRID_STEP),
    []
  );

  const buildTool = tool === "wall" || tool === "room" || tool === "column" || tool === "beam";

  return (
    <div className={`canvas-zone ${buildTool ? "canvas-zone--build" : ""}`} ref={zoneRef}>
      <div className="canvas-stage" style={{ width: fit.w }}>
        <Ruler width={fit.w} />
        <svg
          ref={sheetRef}
          className="sheet"
          viewBox={`0 0 ${SHEET_W} ${SHEET_H}`}
          width={fit.w}
          height={fit.h}
        >
          <rect
            x={0}
            y={0}
            width={SHEET_W}
            height={SHEET_H}
            fill="transparent"
            onClick={(e) => {
              const p = toLogical(e);
              canvasClick(p.x, p.y);
            }}
            onPointerMove={(e) => {
              const p = toLogical(e);
              hover(p.x, p.y);
            }}
          />
          {vLines.map((x) => (
            <line key={`v${x}`} x1={x} y1={0} x2={x} y2={SHEET_H} stroke="var(--grid)" />
          ))}
          {hLines.map((y) => (
            <line key={`h${y}`} x1={0} y1={y} x2={SHEET_W} y2={y} stroke="var(--grid)" />
          ))}
          <line x1={SHEET_W / 2} y1={0} x2={SHEET_W / 2} y2={SHEET_H} stroke="var(--grid-strong)" />
          <line x1={0} y1={SHEET_H / 2} x2={SHEET_W} y2={SHEET_H / 2} stroke="var(--grid-strong)" />
          <circle
            cx={SHEET_W / 2}
            cy={SHEET_H / 2}
            r={6}
            fill="rgba(124,92,252,0.13)"
            stroke="rgba(124,92,252,0.4)"
            strokeWidth={1}
          />

          {elements.length === 0 && (
            <text
              className="sheet__hint"
              x={SHEET_W / 2}
              y={SHEET_H / 2}
              textAnchor="middle"
              dominantBaseline="central"
            >
              empty sheet — pick a build tool, click to place
            </text>
          )}

          {elements.map((el) => (
            <g key={el.id} className="el" onClick={(e) => e.stopPropagation()}>
              <rect
                className={el.id === selectedId ? "el__body el__body--selected" : "el__body"}
                x={el.x}
                y={el.y}
                width={el.w}
                height={el.h}
                rx={1}
                fill={MATERIAL_COLORS[el.material]}
                stroke={el.id === selectedId ? "var(--accent)" : "var(--el-edge)"}
                onPointerDown={(e) => grab(e, pressMove, el.id)}
                onPointerMove={(e) => {
                  const p = toLogical(e);
                  dragMove(el.id, p.x, p.y);
                }}
                onPointerUp={release}
                onPointerCancel={release}
              />
              <rect
                className="el__lit"
                x={el.x}
                y={el.y}
                width={el.w}
                height={1}
                fill="var(--el-highlight)"
              />
              <text
                className={el.kind === "room" ? "el__label el__label--room" : "el__label"}
                x={el.x + el.w / 2}
                y={el.y + el.h / 2}
                textAnchor="middle"
                dominantBaseline="central"
              >
                {ELEMENT_LABELS[el.kind]}
              </text>
              {el.id === selectedId && (
                <rect
                  className="el__handle"
                  x={el.x + el.w - 11}
                  y={el.y + el.h - 11}
                  width={11}
                  height={11}
                  rx={2}
                  onPointerDown={(e) => grab(e, pressSize, el.id)}
                  onPointerMove={(e) => {
                    const p = toLogical(e);
                    dragSize(el.id, p.x, p.y);
                  }}
                  onPointerUp={release}
                  onPointerCancel={release}
                />
              )}
            </g>
          ))}
        </svg>
      </div>
    </div>
  );
}

export function StudioPage() {
  const lang = useUi((s) => s.lang);
  const s = STR[lang];
  const tool = useStudio((st) => st.tool);
  const setTool = useStudio((st) => st.setTool);
  const deselect = useStudio((st) => st.deselect);
  const selectedId = useStudio((st) => st.selectedId);
  const project = useStudio((st) => st.projects[st.currentIdx]);
  const select = useStudio((st) => st.select);

  const elements = project?.elements ?? [];
  const sel = elements.find((e) => e.id === selectedId);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = document.activeElement?.tagName;
      if (t === "INPUT" || t === "TEXTAREA" || (e.target as HTMLElement)?.isContentEditable) return;
      const st = useStudio.getState();
      const mod = e.metaKey || e.ctrlKey;
      const k = e.key.toLowerCase();

      if (mod && k === "s") {
        e.preventDefault();
        st.save();
        return;
      }
      if (mod && k === "z") {
        e.preventDefault();
        if (e.shiftKey) st.redo();
        else st.undo();
        return;
      }
      if (mod && k === "y") {
        e.preventDefault();
        st.redo();
        return;
      }
      if (mod && k === "d") {
        e.preventDefault();
        if (st.selectedId) st.duplicate(st.selectedId);
        return;
      }

      const toolMap: Record<string, Tool> = {
        v: "select",
        m: "move",
        w: "wall",
        r: "room",
        c: "column",
        b: "beam",
      };
      const toolHit = toolMap[k];
      if (toolHit && !mod) {
        st.setTool(toolHit);
        return;
      }
      if (e.key === "Escape") {
        st.deselect();
        return;
      }
      const selId = st.selectedId;
      if (!selId) return;
      if (e.key === "Delete" || e.key === "Backspace") {
        e.preventDefault();
        st.remove(selId);
        return;
      }
      const step = 8;
      const moves: Record<string, [number, number]> = {
        ArrowLeft: [-step, 0],
        ArrowRight: [step, 0],
        ArrowUp: [0, -step],
        ArrowDown: [0, step],
      };
      const mv = moves[e.key];
      if (mv) {
        e.preventDefault();
        st.nudge(selId, mv[0], mv[1]);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  return (
    <div className="page studio">
      <aside className="studio-dock">
        <div className="dock__scroll">
          <div className="dock__group">
            <Caption text="TOOLS" />
          </div>
          {NAV_TOOLS.map((td) => (
            <ToolButton
              key={td.t}
              icon={td.icon}
              label={td.label}
              keyHint={td.key}
              active={tool === td.t}
              onClick={() => setTool(td.t)}
            />
          ))}
          <div className="dock__gap" />
          <div className="dock__group">
            <Caption text="BUILD" />
          </div>
          {BUILD_TOOLS.map((td) => (
            <ToolButton
              key={td.t}
              icon={td.icon}
              label={td.label}
              keyHint={td.key}
              active={tool === td.t}
              onClick={() => setTool(td.t)}
            />
          ))}
          <div className="dock__gap" />
          <div className="dock__layers-head">
            <Caption text="LAYERS" />
            <span className="dock__spacer" />
            <span className="dock__count mono">{elements.length}</span>
            <button className="dock__clear mono" onClick={deselect}>
              clear
            </button>
          </div>
          {elements.length === 0 && <div className="dock__empty mono">— empty —</div>}
          <div className="dock__tree">
            {elements.map((el) => (
              <TreeRow
                key={el.id}
                name={elementName(project!, el.id)}
                kind={KIND_LABELS[el.kind]}
                dot={MATERIAL_COLORS[el.material]}
                selected={el.id === selectedId}
                onClick={() => select(el.id)}
              />
            ))}
          </div>
          <div className="dock__fill" />
          <div className="dock__foot mono">sheet A-101 · 900×600</div>
        </div>
      </aside>

      <section className="studio-viewport">
        <div className="viewport-info">
          <span className="viewport-info__hint mono">
            {tool === "select"
              ? s.selectHint
              : tool === "move"
                ? s.moveHint
                : `${s.placeHint} (${tool})`}
          </span>
          <span className="viewport-info__spacer" />
          <span className={selectedId ? "viewport-info__sel mono viewport-info__sel--on" : "viewport-info__sel mono"}>
            {sel ? `${elementName(project!, sel.id)} · ${MATERIAL_LABELS[sel.material]}` : s.noSelectionHint}
          </span>
        </div>
        <Canvas />
      </section>

      <aside className="studio-inspector">
        <Inspector />
      </aside>
    </div>
  );
}