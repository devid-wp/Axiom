import { Home, Box, BookOpen, Compass, Sparkles } from "lucide-react";
import { useUi } from "@/store/ui";
import { RailButton } from "@/components/RailButton";
import "./shell.css";

const NAV_ITEMS = [
  { key: "start", icon: <Home size={17} />, title: "Start" },
  { key: "study", icon: <BookOpen size={17} />, title: "Study" },
  { key: "explore", icon: <Compass size={17} />, title: "Explore" },
  { key: "studio", icon: <Box size={17} />, title: "Studio" },
] as const;

export function ActivityBar() {
  const view = useUi((s) => s.view);
  const lang = useUi((s) => s.lang);
  const setView = useUi((s) => s.setView);
  const toggleLang = useUi((s) => s.toggleLang);
  const aiPanel = useUi((s) => s.aiPanel);
  const toggleAiPanel = useUi((s) => s.toggleAiPanel);

  return (
    <nav className="activity">
      <div className="activity__logo">
        <span className="activity__logo-mark mono">A⌀</span>
      </div>

      <div className="activity__divider" />

      <span className="activity__label mono">NAV</span>
      {NAV_ITEMS.map((item) => (
        <RailButton
          key={item.key}
          icon={item.icon}
          active={view === item.key}
          onClick={() => setView(item.key)}
          title={item.title}
        />
      ))}

      <div className="activity__divider" />

      <span className="activity__label mono">AI</span>
      <RailButton
        icon={<Sparkles size={17} />}
        active={aiPanel}
        onClick={toggleAiPanel}
        title="AI"
      />

      <div className="activity__spacer" />

      <button className={`activity__lang mono ${lang === "ru" ? "activity__lang--ru" : ""}`} onClick={toggleLang} title="Language">
        {lang === "en" ? "EN" : "РУ"}
      </button>
    </nav>
  );
}
