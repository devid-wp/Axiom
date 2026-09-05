import { Plus, Redo2, Save, Download } from "lucide-react";
import { useUi } from "@/store/ui";
import { useStudio } from "@/store/studio";
import { Button } from "@/components/Button";
import "./shell.css";

export function TitleBar() {
  const view = useUi((s) => s.view);
  const setView = useUi((s) => s.setView);
  const projectName = useStudio((s) => s.projects[s.currentIdx]?.name ?? "");
  const undoEnabled = useStudio((s) => s.undoEnabled);
  const redoEnabled = useStudio((s) => s.redoEnabled);
  const undo = useStudio((s) => s.undo);
  const redo = useStudio((s) => s.redo);
  const save = useStudio((s) => s.save);
  const exportCopy = useStudio((s) => s.exportCopy);
  const newProject = useStudio((s) => s.newProject);

  return (
    <header className="titlebar">
      <div className="titlebar__left">
        <span className="title__logo">AXIOM</span>
        <span className="title__divider" />
        {view === "studio" && (
          <span className="title__doc">
            <span className="title__dot" />
            <span className="title__project">{projectName}</span>
            <span className="title__meta">— sheet A-101</span>
            <button className="title__new" onClick={newProject} title="New project">
              <Plus size={13} />
            </button>
          </span>
        )}
        {view === "start" && <span className="title__section">START</span>}
        {view === "study" && <span className="title__section">STUDY — workspace</span>}
        {view === "explore" && <span className="title__section">EXPLORE — index</span>}
      </div>

      <div className="titlebar__actions">
        {view === "studio" ? (
          <>
            <Button enabled={undoEnabled} onClick={undo} title="Undo (Ctrl+Z)">
              <Redo2 style={{ transform: "scaleX(-1)" }} size={13} />
            </Button>
            <Button enabled={redoEnabled} onClick={redo} title="Redo (Ctrl+Shift+Z)">
              <Redo2 size={13} />
            </Button>
            <span className="titlebar__group-gap" />
            <Button onClick={save} title="Save (Ctrl+S)">
              <Save size={13} />
              Save
            </Button>
            <Button kind="primary" onClick={exportCopy} title="Export JSON">
              <Download size={13} />
              Export
            </Button>
          </>
        ) : (
          <Button kind="primary" onClick={() => setView("studio")}>
            Open Studio
          </Button>
        )}
      </div>
    </header>
  );
}