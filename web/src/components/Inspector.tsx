import { useState } from "react";
import { useUi } from "@/store/ui";
import { useStudio } from "@/store/studio";
import { STR } from "@/i18n";
import {
  KIND_DISPLAY,
  KIND_LABELS,
  MATERIAL_COLORS,
  MATERIAL_LABELS,
  allowedChildrenOf,
  childrenOf,
  elementName,
  isContainer,
  meters,
  thicknessFor,
} from "@/studio/domain";
import type { Material } from "@/studio/types";
import { SegTab } from "./SegTab";
import { Caption } from "./Caption";
import { InspectorSection } from "./InspectorSection";
import { PropRow } from "./PropRow";
import { NumberInput } from "./NumberInput";
import { MaterialSwatch } from "./MaterialSwatch";
import { Button } from "./Button";
import "./inspector.css";

const MATERIALS: Material[] = ["concrete", "brick", "glass", "timber", "steel"];

export function Inspector() {
  const lang = useUi((s) => s.lang);
  const s = STR[lang];
  const [tab, setTab] = useState<"props" | "mat">("props");
  const project = useStudio((st) => st.projects[st.currentIdx]);
  const selectedId = useStudio((st) => st.selectedId);
  const nudge = useStudio((st) => st.nudge);
  const sizeStep = useStudio((st) => st.sizeStep);
  const rotate = useStudio((st) => st.rotate);
  const applyMaterial = useStudio((st) => st.applyMaterial);
  const duplicate = useStudio((st) => st.duplicate);
  const remove = useStudio((st) => st.remove);
  const enter = useStudio((st) => st.enter);

  const sel = project?.elements.find((e) => e.id === selectedId);
  const name = sel && project ? elementName(project, sel.id) : "";
  const parent = sel?.parentId ? project?.elements.find((e) => e.id === sel.parentId) : undefined;
  const kids = sel && project ? childrenOf(project.elements, sel.id) : [];
  const canOpen = sel ? isContainer(sel.kind) : false;

  return (
    <div className="inspector">
      <div className="inspector__tabs">
        <SegTab text={s.props} active={tab === "props"} onClick={() => setTab("props")} />
        <SegTab text={s.material} active={tab === "mat"} onClick={() => setTab("mat")} />
      </div>
      <div className="inspector__rule" />

      {!sel && (
        <div className="inspector__empty">
          <div className="inspector__spacer" />
          <div className="inspector__empty-label">{s.noSelection}</div>
          <div className="inspector__project">{project?.name}</div>
          <div className="inspector__project-meta mono">
            {project?.elements.length ?? 0} {s.elements} · {s.local}
          </div>
          <div className="inspector__spacer" />
          <div className="inspector__steps mono">{s.step1}</div>
          <div className="inspector__steps mono">{s.step2}</div>
          <div className="inspector__steps mono">{s.step3}</div>
        </div>
      )}

      {sel && tab === "props" && (
        <div className="inspector__props">
          <div className="inspector__head">
            <div className="inspector__name">{name}</div>
            <div className="inspector__meta mono">
              {KIND_DISPLAY[sel.kind]} · {MATERIAL_LABELS[sel.material]}
            </div>
            <div className="inspector__meta mono">
              {parent && project ? `in ${elementName(project, parent.id)}` : "at project root"}
              {kids.length > 0 ? ` · ${kids.length} inside` : ""}
            </div>
          </div>
          {canOpen && (
            <InspectorSection title="CONTEXT">
              <div className="inspector__actions">
                <Button onClick={() => enter(sel.id)}>
                  Open {KIND_LABELS[sel.kind]} →
                </Button>
              </div>
              <div className="inspector__steps mono">
                holds: {allowedChildrenOf(sel.kind).join(", ") || "—"}
              </div>
            </InspectorSection>
          )}
          <InspectorSection title={s.transform}>
            <PropRow label="X" value={meters(sel.x)} />
            <PropRow label="Y" value={meters(sel.y)} />
            <PropRow label="elev" value="0.00m" />
            <NumberInput
              label="X"
              value={meters(sel.x)}
              onDec={() => nudge(sel.id, -8, 0)}
              onInc={() => nudge(sel.id, 8, 0)}
            />
            <NumberInput
              label="Y"
              value={meters(sel.y)}
              onDec={() => nudge(sel.id, 0, -8)}
              onInc={() => nudge(sel.id, 0, 8)}
            />
          </InspectorSection>
          <InspectorSection title={s.dimensions}>
            <PropRow label="length" value={meters(sel.w)} />
            <PropRow label="width" value={meters(sel.h)} />
            <PropRow label="thick" value={thicknessFor(sel.kind)} />
            <PropRow label="rot" value={`${Math.round(sel.rotation ?? 0)}°`} />
            <NumberInput
              label="W"
              value={meters(sel.w)}
              onDec={() => sizeStep(sel.id, -16, 0)}
              onInc={() => sizeStep(sel.id, 16, 0)}
            />
            <NumberInput
              label="H"
              value={meters(sel.h)}
              onDec={() => sizeStep(sel.id, 0, -16)}
              onInc={() => sizeStep(sel.id, 0, 16)}
            />
            <NumberInput
              label="⟳"
              value={`${Math.round(sel.rotation ?? 0)}°`}
              onDec={() => rotate(sel.id, -15)}
              onInc={() => rotate(sel.id, 15)}
            />
          </InspectorSection>
          <InspectorSection title={s.actionsGroup}>
            <div className="inspector__actions">
              <Button onClick={() => duplicate(sel.id)}>Duplicate</Button>
              <Button kind="danger" onClick={() => remove(sel.id)}>
                Delete
              </Button>
            </div>
          </InspectorSection>
        </div>
      )}

      {sel && tab === "mat" && (
        <div className="inspector__materials">
          <div className="inspector__materials-inner">
            <Caption text="SYSTEM" />
            {MATERIALS.map((m) => (
              <MaterialSwatch
                key={m}
                label={MATERIAL_LABELS[m]}
                swatch={MATERIAL_COLORS[m]}
                active={sel.material === m}
                onClick={() => applyMaterial(sel.id, m)}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}