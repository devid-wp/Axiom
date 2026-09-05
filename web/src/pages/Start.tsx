import { useUi } from "@/store/ui";
import { useStudio } from "@/store/studio";
import { STR } from "@/i18n";
import { Caption } from "@/components/Caption";
import { CmdRow } from "@/components/CmdRow";
import "./Start.css";

export function StartPage() {
  const lang = useUi((s) => s.lang);
  const s = STR[lang];
  const setView = useUi((s) => s.setView);
  const projects = useStudio((st) => st.projects);
  const currentIdx = useStudio((st) => st.currentIdx);
  const newProject = useStudio((st) => st.newProject);
  const openProject = useStudio((st) => st.openProject);

  const current = projects[currentIdx];

  return (
    <div className="page start">
      <div className="start__rail" />
      <div className="start__column">
        <div className="start__version mono">AXIOM 0.2.0 — web</div>
        <div className="start__gap-lg" />

        <Caption text={s.start} />
        <div className="start__gap-sm" />
        <CmdRow
          icon="+"
          title={s.newProject}
          hint={s.emptySheet}
          primary
          onClick={() => {
            newProject();
            setView("studio");
          }}
        />
        <CmdRow
          icon="→"
          title={`${s.continueProject} — ${current?.name ?? ""}`}
          hint={`${current?.elements.length ?? 0} ${s.elements}`}
          onClick={() => setView("studio")}
        />
        <CmdRow icon="⬢" title={s.openStudio} hint={s.workspace} onClick={() => setView("studio")} />

        <div className="start__gap-lg" />

        <Caption text={s.learn} />
        <div className="start__gap-sm" />
        <CmdRow icon="◐" title={s.continueStudy} hint="9 min" onClick={() => setView("study")} />
        <CmdRow icon="◎" title={s.browseTopics} hint={`9 ${s.entries}`} onClick={() => setView("explore")} />

        <div className="start__gap-lg" />

        <Caption text={s.recent} />
        <div className="start__gap-sm" />
        {projects.map((p, i) => (
          <CmdRow
            key={p.id}
            icon="▭"
            title={p.name}
            hint={`${p.elements.length} ${s.elements} · ${s.local}`}
            onClick={() => {
              openProject(i);
              setView("studio");
            }}
          />
        ))}

        <div className="start__gap-sm" />
        <div className="start__fill" />
        <span className="start__footer mono">{s.configLine}</span>
      </div>
      <div className="start__fill" />
    </div>
  );
}