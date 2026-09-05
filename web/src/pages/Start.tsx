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
  const requestAi = useUi((s) => s.requestAi);
  const projects = useStudio((st) => st.projects);
  const currentIdx = useStudio((st) => st.currentIdx);
  const newProject = useStudio((st) => st.newProject);
  const openProject = useStudio((st) => st.openProject);

  const current = projects[currentIdx];

  const openAi = () => {
    setView("studio");
    requestAi();
  };

  return (
    <div className="page start">
      <div className="start__rail" />
      <div className="start__column">
        <div className="start__masthead">
          <span className="start__logo">AXIOM</span>
          <span className="start__version mono">0.2.0 — web</span>
        </div>

        <div className="start__greeting">
          <span className="start__greet-label mono">{s.start}</span>
          <span className="start__greet-body">{s.goodAfternoon}</span>
        </div>
        <div className="start__gap-lg" />

        <div className="start__block">
          <Caption text={s.continueBlock} />
          <div className="start__gap-sm" />
          <div className="start__continue">
            <div className="start__continue-main">
              <div className="start__continue-title">{current?.name ?? s.newProject}</div>
              <div className="start__continue-meta mono">
                {current ? `${current.elements.length} ${s.elements} · ${s.local}` : s.emptySheet}
              </div>
            </div>
            <div className="start__continue-actions">
              {current && (
                <CmdRow
                  icon="→"
                  title={s.continueProject}
                  hint={`${current.elements.length} ${s.elements}`}
                  onClick={() => setView("studio")}
                />
              )}
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
            </div>
          </div>
        </div>

        <div className="start__gap-lg" />

        <div className="start__block">
          <Caption text={s.learn} />
          <div className="start__gap-sm" />
          <CmdRow icon="◐" title={s.continueStudy} hint="9 min" onClick={() => setView("study")} />
          <CmdRow icon="◎" title={s.browseTopics} hint={`9 ${s.entries}`} onClick={() => setView("explore")} />
        </div>

        <div className="start__gap-lg" />

        <div className="start__block">
          <Caption text={s.aiSection} />
          <div className="start__gap-sm" />
          <div className="start__ai-row" onClick={openAi}>
            <div className="start__ai-glyph">◇</div>
            <div className="start__ai-main">
              <div className="start__ai-title">{s.aiAskCta}</div>
              <div className="start__ai-meta">{s.aiHomeHint}</div>
            </div>
            <div className="start__ai-open mono">{s.aiOpen}</div>
          </div>
        </div>

        <div className="start__gap-lg" />

        <div className="start__block">
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
          {projects.length === 0 && <div className="start__empty mono">{s.emptyProjectList}</div>}
        </div>

        <div className="start__gap-sm" />
        <div className="start__fill" />
        <span className="start__footer mono">{s.configLine}</span>
      </div>
      <div className="start__fill" />
    </div>
  );
}