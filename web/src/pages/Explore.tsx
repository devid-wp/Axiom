import { useUi } from "@/store/ui";
import { useStudy } from "@/store/study";
import { STR } from "@/i18n";
import { categories } from "@/data/content";
import { Caption } from "@/components/Caption";
import { IndexRow } from "@/components/IndexRow";
import { ArrowRight, Compass } from "lucide-react";
import "./Explore.css";

const CATEGORY_META: Record<string, { icon: string; blurb: string }> = {
  styles: { icon: "⌖", blurb: "Architecture through time" },
  structures: { icon: "△", blurb: "The systems that stand" },
  materials: { icon: "▦", blurb: "The matter of building" },
  engineering: { icon: "⚙", blurb: "The forces at work" },
};

export function ExplorePage() {
  const lang = useUi((s) => s.lang);
  const s = STR[lang];
  const category = useStudy((st) => st.category);
  const openByCategory = useStudy((st) => st.openByCategory);
  const openEntry = useStudy((st) => st.openEntry);

  const cat = categories[category];
  const entries = cat.entries.filter((e) => e.data[lang] !== undefined);

  return (
    <div className="page explore">
      <div className="explore__scroll">
        <div className="explore__layout">
          <header className="explore__head">
            <div className="explore__title-row">
              <h1 className="explore__title">Knowledge Index</h1>
              <span className="explore__tag mono">iterator / reference</span>
            </div>
            <p className="explore__lede">
              {s.exploreLede}
            </p>
          </header>

          <div className="explore__cats">
            {categories.map((c, i) => (
              <button
                key={c.id}
                className={`explore__cat ${category === i ? "explore__cat--on" : ""}`}
                onClick={() => openByCategory(i)}
              >
                <span className="explore__cat-glyph">{CATEGORY_META[c.id]?.icon ?? "·"}</span>
                <span className="explore__cat-id mono">{c.id}</span>
                <span className="explore__cat-meta mono">
                  {c.entries.length}
                </span>
                <span className="explore__cat-active" />
              </button>
            ))}
          </div>

          <div className="explore__list-head">
            <span className="eyebrow eyebrow--noted">{cat.id} — {cat.meta[lang]}</span>
            <span className="explore__count mono">{String(entries.length).padStart(2, "0")} entries</span>
          </div>

          <div className="explore__index">
            {entries.map((e, i) => {
              const d = e.data[lang];
              return (
                <IndexRow
                  key={e.id}
                  idx={String(i + 1).padStart(2, "0")}
                  title={d.title}
                  text={d.text}
                  dot={d.dot}
                  accent={e.accent}
                  onClick={() => {
                    openEntry(category, e.lesson);
                    useUi.getState().setView("study");
                  }}
                />
              );
            })}
          </div>

          <div className="explore__note mono">
            <ArrowRight size={12} />
            {s.exploreNote}
          </div>
        </div>
      </div>
    </div>
  );
}
