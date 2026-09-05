import { useUi } from "@/store/ui";
import { useStudy } from "@/store/study";
import { STR } from "@/i18n";
import { categories } from "@/data/content";
import { Caption } from "@/components/Caption";
import { IndexRow } from "@/components/IndexRow";
import "./Explore.css";

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
        <div className="explore__head">
          <h1 className="explore__title">{s.exploreTitle}</h1>
          <div className="explore__category-row">
            {categories.map((c, i) => (
              <button
                key={c.id}
                className={`explore__category mono ${category === i ? "explore__category--on" : ""}`}
                onClick={() => openByCategory(i)}
              >
                {c.id.toUpperCase()}
              </button>
            ))}
          </div>
          <div className="explore__meta mono">{s.local}</div>
        </div>

        <Caption text={`${cat.id.toUpperCase()} — ${cat.meta[lang]}`} />
        <div className="explore__gap" />

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
          <div className="explore__gap" />
          <div className="explore__note mono">{s.exploreNote}</div>
        </div>
      </div>
    </div>
  );
}