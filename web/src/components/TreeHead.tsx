import "./content.css";

interface Props {
  text: string;
  meta: string;
  accent: string;
  active: boolean;
  onClick: () => void;
}

export function TreeHead({ text, meta, accent, active, onClick }: Props) {
  return (
    <button className={active ? "tree-head tree-head--active" : "tree-head"} onClick={onClick}>
      <span className="tree-head__bar" style={{ background: active ? accent : "transparent" }} />
      <span className="tree-head__text">
        <span className="tree-head__title">{text}</span>
        <span className="tree-head__meta mono">{meta}</span>
      </span>
    </button>
  );
}