import { useUi } from "@/store/ui";
import { useStudio } from "@/store/studio";
import "./shell.css";

export function StatusBar() {
  const view = useUi((s) => s.view);
  const lang = useUi((s) => s.lang);
  const studio = useStudio();

  const isStudio = view === "studio";
  const dotClass = !isStudio ? "status__dot--idle" : studio.tool === "select" ? "status__dot--ok" : "status__dot--acc";

  let viewLabel = "START";
  if (view === "studio") viewLabel = `STUDIO · ${studio.tool}`;
  else if (view === "study") viewLabel = "STUDY";
  else if (view === "explore") viewLabel = "EXPLORE";

  const projectName = studio.projects[studio.currentIdx]?.name ?? "";
  const count = studio.projects[studio.currentIdx]?.elements.length ?? 0;

  return (
    <footer className="status">
      <span className={`status__dot ${dotClass}`} />
      <span className="status__view">{viewLabel}</span>
      <span className="status__spacer" />
      {isStudio && (
        <span className="status__cell mono">{studio.cursorLabel}</span>
      )}
      {isStudio && <span className="status__cell mono">{studio.zoomLabel}</span>}
      {isStudio && <span className="status__cell mono">snap 8</span>}
      {isStudio && <span className="status__cell mono">{count} el</span>}
      {!isStudio && (
        <span className="status__cell mono">
          {count} el · {projectName}
        </span>
      )}
      <span className="status__saved">{studio.savedLabel}</span>
      <span className="status__lang mono">{lang === "ru" ? "РУ" : "EN"}</span>
    </footer>
  );
}