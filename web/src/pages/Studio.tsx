import { useEffect, useMemo, useRef, useState } from "react";
import { useUi } from "@/store/ui";
import { useStudio, visibleElements } from "@/store/studio";
import { useTutor } from "@/ai/service";
import { STR } from "@/i18n";
import { AiChat } from "@/components/ai/AiChat";
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
  allowedChildrenOf,
  breadcrumbs,
  childrenOf,
  elementName,
  isContainer,
} from "@/studio/domain";
import type { Element as StudioElement, ElementKind, Tool } from "@/studio/types";
import { Sparkles, MousePointer2, Move } from "lucide-react";
import "./Studio.css";

const ZOOM_STEP = 0.15;

interface ToolDef {
  t: Tool;
  label: string;
  key?: string;
}

const NAV_TOOLS: ToolDef[] = [
  { t: "select", label: "Select", key: "V" },
  { t: "move", label: "Move", key: "M" },
];

/* Build tools grouped by hierarchy level: structure → space → openings. */
const TOOL_GROUPS: Array<{ title: string; tools: ToolDef[] }> = [
  {
    title: "Structure",
    tools: [
      { t: "building", label: "Building", key: "G" },
      { t: "floor", label: "Floor", key: "F" },
      { t: "roof", label: "Roof", key: "U" },
    ],
  },
  {
    title: "Space",
    tools: [
      { t: "room", label: "Room", key: "R" },
      { t: "corridor", label: "Corridor", key: "T" },
    ],
  },
  {
    title: "Openings",
    tools: [
      { t: "wall", label: "Wall", key: "W" },
      { t: "door", label: "Door", key: "D" },
      { t: "window", label: "Window", key: "N" },
    ],
  },
  {
    title: "Legacy",
    tools: [
      { t: "column", label: "Column", key: "C" },
      { t: "beam", label: "Beam", key: "B" },
    ],
  },
];

const ELEMENT_LABELS: Record<StudioElement["kind"], string> = {
  building: "BLDG",
  floor: "FLOOR",
  room: "ROOM",
  corridor: "CORR",
  wall: "WALL",
  door: "DOOR",
  window: "WIN",
  roof: "ROOF",
  column: "▮",
  beam: "BEAM",
};

const GROUP_ICONS: Record<string, React.ReactNode> = {
  select: <MousePointer2 size={14} />,
  move: <Move size={14} />,
  building: <span className="tool-glyph">▣</span>,
  floor: <span className="tool-glyph">▤</span>,
  roof: <span className="tool-glyph">△</span>,
  room: <span className="tool-glyph">▭</span>,
  corridor: <span className="tool-glyph">▬</span>,
  wall: <span className="tool-glyph">—</span>,
  door: <span className="tool-glyph">🚪</span>,
  window: <span className="tool-glyph">⊞</span>,
  column: <span className="tool-glyph">⬢</span>,
  beam: <span className="tool-glyph">━</span>,
};

function Ruler({ width, zoom }: { width: number; zoom: number }) {
  const s = (width * zoom) / SHEET_W;
  const ticks = Array.from({ length: Math.floor(SHEET_W / GRID_STEP) + 1 }, (_, i) => i * GRID_STEP);
  const labels = [0, 4, 8, 12, 16, 20];
  return (
    <div className="ruler" style={{ width: width * zoom }}>
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

/* ---------------------------------- tree --------------------------------- */

function TreeNode({
  elements,
  parentId,
  depth,
  project,
  selectedId,
  pathIds,
  onSelect,
  onEnter,
}: {
  elements: StudioElement[];
  parentId: string | null;
  depth: number;
  project: NonNullable<ReturnType<typeof useStudio.getState>["projects"][number]> | undefined;
  selectedId: string;
  pathIds: Set<string>;
  onSelect: (id: string) => void;
  onEnter: (id: string) => void;
}) {
  if (!project) return null;
  return (
    <>
      {childrenOf(elements, parentId).map((el) => (
        <div key={el.id}>
          <div className="hier-row" style={{ paddingLeft: 8 + depth * 14 }}>
            {depth > 0 && <span className="hier-row__guide">└</span>}
            <div className="hier-row__main">
              <TreeRow
                name={elementName(project, el.id)}
                kind={KIND_LABELS[el.kind]}
                dot={MATERIAL_COLORS[el.material]}
                selected={el.id === selectedId}
                onClick={() => onSelect(el.id)}
              />
            </div>
            {isContainer(el.kind) && (
              <button
                className={pathIds.has(el.id) ? "hier-row__open mono hier-row__open--on" : "hier-row__open mono"}
                title={pathIds.has(el.id) ? "Currently open" : `Open ${elementName(project, el.id)}`}
                onClick={() => onEnter(el.id)}
              >
                {pathIds.has(el.id) ? "●" : "→"}
              </button>
            )}
          </div>
          <TreeNode
            elements={elements}
            parentId={el.id}
            depth={depth + 1}
            project={project}
            selectedId={selectedId}
            pathIds={pathIds}
            onSelect={onSelect}
            onEnter={onEnter}
          />
        </div>
      ))}
    </>
  );
}

/* --------------------------------- canvas -------------------------------- */

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
  const elements = useStudio((s) => visibleElements(s));
  const contextId = useStudio((s) => s.contextId);
  const project = useStudio((s) => s.projects[s.currentIdx]);
  const flash = useTutor((s) => s.lastAction);
  const zoom = useStudio((s) => s.zoom);
  const panX = useStudio((s) => s.panX);
  const panY = useStudio((s) => s.panY);
  const zoomBy = useStudio((s) => s.zoomBy);
  const startPan = useStudio((s) => s.startPan);
  const dragPan = useStudio((s) => s.dragPan);
  const endPan = useStudio((s) => s.endPan);
  const _panning = useStudio((s) => s._panning);
  const _snapGuides = useStudio((s) => s._snapGuides);

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

  const effectiveW = Math.round(fit.w * zoom);
  const effectiveH = Math.round(fit.h * zoom);

  const viewBoxStr = useMemo(() => {
    const vw = SHEET_W / zoom;
    const vh = SHEET_H / zoom;
    const vx = -panX / (fit.k * zoom);
    const vy = -panY / (fit.k * zoom);
    return `${vx} ${vy} ${vw} ${vh}`;
  }, [zoom, panX, panY, fit.k]);

  const toLogical = (e: { clientX: number; clientY: number }) => {
    const rect = sheetRef.current?.getBoundingClientRect();
    if (!rect || rect.width === 0) return { x: 0, y: 0 };
    return {
      x: ((e.clientX - rect.left) / rect.width) * SHEET_W,
      y: ((e.clientY - rect.top) / rect.height) * SHEET_H,
    };
  };

  const onWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const rect = sheetRef.current?.getBoundingClientRect();
    if (!rect) return;
    const cx = e.clientX - rect.left - rect.width / 2;
    const cy = e.clientY - rect.top - rect.height / 2;
    const delta = e.deltaY > 0 ? -ZOOM_STEP : ZOOM_STEP;
    zoomBy(delta, cx * (fit.k * zoom), cy * (fit.k * zoom));
  };

  const onPointerDown = (e: React.PointerEvent) => {
    if (e.button === 1 || (e.button === 0 && e.altKey)) {
      e.preventDefault();
      startPan(e.clientX, e.clientY);
      try { (e.currentTarget as Element).setPointerCapture(e.pointerId); } catch { /* ignore */ }
    }
  };

  const onPointerMove = (e: React.PointerEvent) => {
    if (_panning) {
      dragPan(e.clientX, e.clientY);
    }
  };

  const onPointerUp = () => {
    if (_panning) {
      endPan();
    }
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

  const buildTool = tool !== "select" && tool !== "move";
  const ctxEl = contextId ? project?.elements.find((e) => e.id === contextId) : undefined;
  const ctxName = ctxEl && project ? elementName(project, ctxEl.id) : "Project";

  return (
    <div
      className={`canvas-zone ${buildTool ? "canvas-zone--build" : ""} ${_panning ? "canvas-zone--panning" : ""}`}
      ref={zoneRef}
      onWheel={onWheel}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
    >
      <div className="canvas-stage" style={{ width: effectiveW }}>
        <Ruler width={fit.w} zoom={zoom} />
        <svg
          ref={sheetRef}
          className="sheet"
          viewBox={viewBoxStr}
          width={effectiveW}
          height={effectiveH}
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
            <line key={`h${y}`} x1={0} y1={y} x2={SHEET_W} y2={SHEET_H} stroke="var(--grid)" />
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
              {ctxEl
                ? `empty ${ctxEl.kind} — pick a build tool, click to place inside ${ctxName}`
                : "empty project — create a Building to start"}
            </text>
          )}

          {_snapGuides.map((g, i) =>
            g.type === "v" ? (
              <line
                key={`sg${i}`}
                x1={g.pos}
                y1={0}
                x2={g.pos}
                y2={SHEET_H}
                stroke="var(--accent)"
                strokeWidth={0.5}
                strokeDasharray="4 4"
                style={{ pointerEvents: "none" }}
              />
            ) : (
              <line
                key={`sg${i}`}
                x1={0}
                y1={g.pos}
                x2={SHEET_W}
                y2={g.pos}
                stroke="var(--accent)"
                strokeWidth={0.5}
                strokeDasharray="4 4"
                style={{ pointerEvents: "none" }}
              />
            )
          )}

          {elements.map((el) => {
            const cx = el.x + el.w / 2;
            const cy = el.y + el.h / 2;
            const rot = el.rotation ?? 0;
            return (
              <g key={el.id} className="el" onClick={(e) => e.stopPropagation()}>
                <g transform={rot ? `rotate(${rot} ${cx} ${cy})` : undefined}>
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
                    className={el.kind === "room" || el.kind === "floor" ? "el__label el__label--room" : "el__label"}
                    x={cx}
                    y={cy}
                    textAnchor="middle"
                    dominantBaseline="central"
                  >
                    {ELEMENT_LABELS[el.kind]}
                  </text>
                </g>
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
            );
          })}

          {(flash?.ids.length ?? 0) > 0 &&
            elements
              .filter((el) => flash!.ids.includes(el.id))
              .map((el) => (
                <rect
                  key={`f${flash!.stamp}-${el.id}`}
                  className="el__flash"
                  x={el.x - 3}
                  y={el.y - 3}
                  width={el.w + 6}
                  height={el.h + 6}
                  rx={2}
                />
              ))}
        </svg>
      </div>
    </div>
  );
}

/** Compact challenge strip shown just above the AI panel. */
function ExerciseStrip({ onOpen }: { onOpen: () => void }) {
  const s = STR[useUi.getState().lang];
  const exercise = useTutor((st) => st.exercise);
  if (!exercise) return null;
  return (
    <div className="studio-exercise" onClick={onOpen}>
      <span className="studio-exercise__label mono">{s.aiChallenge}</span>
      <span className="studio-exercise__title">{exercise.title}</span>
      <span className="studio-exercise__arrow mono">{"↗"}</span>
    </div>
  );
}

/** Brief "AI changed the canvas" toast with an Undo affordance. */
function ActionToast() {
  const s = STR[useUi((st) => st.lang)];
  const flash = useTutor((st) => st.lastAction);
  if (!flash) return null;
  return (
    <div className="action-toast">
      <span className="action-toast__body">
        {"✓"} {flash.summary} — {s.aiDone}
      </span>
      <button className="action-toast__undo mono" onClick={() => useStudio.getState().undo()}>
        {s.aiUndo}
      </button>
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
  const contextId = useStudio((st) => st.contextId);
  const project = useStudio((st) => st.projects[st.currentIdx]);
  const select = useStudio((st) => st.select);
  const enter = useStudio((st) => st.enter);
  const navigateTo = useStudio((st) => st.navigateTo);
  const navigateParent = useStudio((st) => st.navigateParent);
  const zoomLabel = useStudio((st) => st.zoomLabel);

  const elements = project?.elements ?? [];
  const sel = elements.find((e) => e.id === selectedId);
  const ctxEl = contextId ? elements.find((e) => e.id === contextId) : undefined;
  const crumbs = project ? breadcrumbs(elements, contextId) : [];
  const allowed = useMemo(
    () => allowedChildrenOf(ctxEl?.kind ?? null),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [ctxEl?.kind, ctxEl?.id]
  );
  const [aiOpen, setAiOpen] = useState(false);
  const aiOpenRef = useRef(aiOpen);
  useEffect(() => {
    aiOpenRef.current = aiOpen;
  }, [aiOpen]);

  const aiRequest = useUi((st) => st.aiRequest);
  useEffect(() => {
    if (aiRequest > 0) {
      const u = useUi.getState();
      u.consumeAiRequest();
      setAiOpen(true);
    }
  }, [aiRequest]);
  const exercise = useTutor((st) => st.exercise);

  /* If the active tool is not allowed in the new context, fall back to select. */
  useEffect(() => {
    const st = useStudio.getState();
    if (st.tool !== "select" && st.tool !== "move" && !(allowed as string[]).includes(st.tool)) {
      st.setTool("select");
    }
  }, [allowed]);

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
      if (mod && k === "c") {
        e.preventDefault();
        if (st.selectedId) st.copy(st.selectedId);
        return;
      }
      if (mod && k === "v") {
        e.preventDefault();
        st.paste();
        return;
      }
      if (mod && (k === "=" || k === "+")) {
        e.preventDefault();
        st.zoomBy(ZOOM_STEP);
        return;
      }
      if (mod && k === "-") {
        e.preventDefault();
        st.zoomBy(-ZOOM_STEP);
        return;
      }
      if (mod && k === "0") {
        e.preventDefault();
        st.resetView();
        return;
      }

      if (e.shiftKey && k === "r" && st.selectedId) {
        e.preventDefault();
        st.rotate(st.selectedId, 15);
        return;
      }
      const toolMap: Record<string, Tool> = {
        v: "select",
        m: "move",
        g: "building",
        f: "floor",
        u: "roof",
        r: "room",
        t: "corridor",
        w: "wall",
        d: "door",
        n: "window",
        c: "column",
        b: "beam",
      };
      const toolHit = toolMap[k];
      if (toolHit && !mod) {
        // Respect containment: only switch to tools allowed in this context.
        if (
          toolHit === "select" ||
          toolHit === "move" ||
          allowedChildrenOf(
            st.contextId ? (st.projects[st.currentIdx]?.elements.find((x) => x.id === st.contextId)?.kind ?? null) : null
          ).includes(toolHit as ElementKind)
        ) {
          st.setTool(toolHit);
        }
        return;
      }
      if (e.key === "Enter") {
        if (st.selectedId) {
          const el = st.projects[st.currentIdx]?.elements.find((x) => x.id === st.selectedId);
          if (el && isContainer(el.kind)) st.enter(el.id);
        }
        return;
      }
      if (e.key === "Escape") {
        if (aiOpenRef.current) {
          setAiOpen(false);
          return;
        }
        st.deselect();
        return;
      }
      if (e.key === "Backspace" && (e.metaKey || e.ctrlKey)) {
        // Cmd/Ctrl+Backspace = go up one level
        e.preventDefault();
        st.navigateParent();
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

  const ctxName = ctxEl && project ? elementName(project, ctxEl.id) : "Project";

  return (
    <div className="page studio">
      <aside className="studio-dock">
        <div className="dock__scroll">
          <div className="dock__group">
            <span className="eyebrow">Inspect</span>
          </div>
          {NAV_TOOLS.map((td) => (
            <ToolButton
              key={td.t}
              icon={GROUP_ICONS[td.t]}
              label={td.label}
              keyHint={td.key}
              active={tool === td.t}
              onClick={() => setTool(td.t)}
            />
          ))}
          {TOOL_GROUPS.map((g) => {
            const visible = g.tools.filter((td) => (allowed as string[]).includes(td.t));
            if (visible.length === 0) return null;
            return (
              <div key={g.title}>
                <div className="dock__gap" />
                <div className="dock__group">
                  <span className="eyebrow">{g.title}</span>
                </div>
                {visible.map((td) => (
                  <ToolButton
                    key={td.t}
                    icon={GROUP_ICONS[td.t]}
                    label={td.label}
                    keyHint={td.key}
                    active={tool === td.t}
                    onClick={() => setTool(td.t)}
                  />
                ))}
              </div>
            );
          })}
          <div className="dock__gap" />
          <div className="dock__layers-head">
            <span className="eyebrow">Hierarchy</span>
            <span className="dock__spacer" />
            <span className="dock__count mono">{elements.length}</span>
            <button className="dock__clear mono" onClick={deselect}>
              clear
            </button>
          </div>
          {elements.length === 0 && <div className="dock__empty mono">— empty project —</div>}
          <div className="dock__tree">
            {project && (
              <TreeNode
                elements={elements}
                parentId={null}
                depth={0}
                project={project}
                selectedId={selectedId}
                pathIds={new Set(crumbs.map((c) => c.id))}
                onSelect={select}
                onEnter={enter}
              />
            )}
          </div>
          <div className="dock__fill" />
          <div className="dock__foot mono">sheet A-101 · 900×600</div>
        </div>
      </aside>

      <section className="studio-viewport">
        <nav className="crumbs" aria-label="Architectural context">
          <button
            className={contextId === null ? "crumbs__item mono crumbs__item--on" : "crumbs__item mono"}
            onClick={() => navigateTo(null)}
            title="Project root"
          >
            {project?.name ?? "Project"}
          </button>
          {crumbs.map((c) => (
            <span key={c.id} className="crumbs__seg">
              <span className="crumbs__sep">/</span>
              <button
                className={
                  c.id === contextId ? "crumbs__item mono crumbs__item--on" : "crumbs__item mono"
                }
                onClick={() => navigateTo(c.id)}
              >
                {project ? elementName(project, c.id) : c.kind}
              </button>
            </span>
          ))}
          <span className="crumbs__spacer" />
          {contextId !== null && (
            <button className="crumbs__up mono" onClick={navigateParent} title="Up one level">
              ↑ up
            </button>
          )}
          <span className={selectedId ? "viewport-info__sel mono viewport-info__sel--on" : "viewport-info__sel mono"}>
            {sel && project ? `${elementName(project, sel.id)} · ${MATERIAL_LABELS[sel.material]}` : s.noSelectionHint}
          </span>
          <button
            className={`viewport-ai ${aiOpen ? "viewport-ai--on" : ""}`}
            onClick={() => setAiOpen((v) => !v)}
            title={s.aiAskCta}
          >
            <Sparkles size={13} />
            <span className="viewport-ai__label mono">{s.aiAskAi}</span>
          </button>
        </nav>
        <div className="viewport-info">
          <span className="viewport-info__tool mono">
            {tool.toUpperCase()} · {ctxName.toUpperCase()}
          </span>
          <span className="viewport-info__hint mono">
            {tool === "select"
              ? "click to inspect · Enter opens · double-click a row to open"
              : tool === "move"
                ? s.moveHint
                : `${s.placeHint} (${tool} → ${ctxName})`}
          </span>
          <span className="viewport-info__spacer" />
          <span className="viewport-info__zoom mono">{zoomLabel}</span>
        </div>
        <Canvas />
        <ActionToast />
        <ExerciseStrip onOpen={() => setAiOpen(true)} />
        {aiOpen && (
          <div className="studio-ai-panel">
            <AiChat scope="studio" onClose={() => setAiOpen(false)} />
          </div>
        )}
      </section>

      <aside className="studio-inspector">
        <div className={`inspector-ai-toggle ${aiOpen || exercise ? "inspector-ai-toggle--active" : ""}`}>
          <Sparkles size={12} />
          <span className="inspector-ai-toggle__label mono">
            {exercise ? `${s.aiChallenge} · ${exercise.title}` : s.aiStudio}
          </span>
          <button
            className="inspector-ai-toggle__btn"
            onClick={() => setAiOpen((v) => !v)}
            title={s.aiAskCta}
          >
            {aiOpen ? "×" : "+"}
          </button>
        </div>
        <Inspector />
      </aside>
    </div>
  );
}
