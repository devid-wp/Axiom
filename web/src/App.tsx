import { useUi } from "@/store/ui";
import { ActivityBar } from "@/shell/ActivityBar";
import { TitleBar } from "@/shell/TitleBar";
import { StatusBar } from "@/shell/StatusBar";
import { StartPage } from "@/pages/Start";
import { StudioPage } from "@/pages/Studio";
import { StudyPage } from "@/pages/Study";
import { ExplorePage } from "@/pages/Explore";
import { GlobalAi } from "@/components/ai/GlobalAi";

export default function App() {
  const view = useUi((s) => s.view);
  return (
    <div className="shell">
      <ActivityBar />
      <div className="shell-main">
        <TitleBar />
        <main className="shell-content">
          {view === "start" && <StartPage />}
          {view === "studio" && <StudioPage />}
          {view === "study" && <StudyPage />}
          {view === "explore" && <ExplorePage />}
        </main>
        <StatusBar />
      </div>
      <GlobalAi />
    </div>
  );
}