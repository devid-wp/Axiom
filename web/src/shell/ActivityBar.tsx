import { Home, Box, BookOpen, Compass } from "lucide-react";
import { useUi } from "@/store/ui";
import { RailButton } from "@/components/RailButton";
import "./shell.css";

export function ActivityBar() {
  const view = useUi((s) => s.view);
  const lang = useUi((s) => s.lang);
  const setView = useUi((s) => s.setView);
  const toggleLang = useUi((s) => s.toggleLang);

  return (
    <nav className="activity">
      <div className="activity__logo">A</div>
      <RailButton icon={<Home size={17} />} active={view === "start"} onClick={() => setView("start")} title="Start" />
      <RailButton icon={<Box size={17} />} active={view === "studio"} onClick={() => setView("studio")} title="Studio" />
      <RailButton
        icon={<BookOpen size={17} />}
        active={view === "study"}
        onClick={() => setView("study")}
        title="Study"
      />
      <RailButton
        icon={<Compass size={17} />}
        active={view === "explore"}
        onClick={() => setView("explore")}
        title="Explore"
      />
      <div className="activity__spacer" />
      <RailButton icon={lang === "en" ? "EN" : "РУ"} active={false} onClick={toggleLang} title="Language" />
    </nav>
  );
}