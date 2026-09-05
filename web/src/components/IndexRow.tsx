interface Props {
  idx: string;
  title: string;
  text: string;
  dot: string;
  accent: string;
  onClick: () => void;
}

export function IndexRow({ idx, title, text, dot, accent, onClick }: Props) {
  return (
    <button className="index-row" onClick={onClick}>
      <span className="index-row__idx mono">{idx}</span>
      <span className="index-row__body">
        <span className="index-row__title">{title}</span>
        <span className="index-row__desc">{text}</span>
      </span>
      <span className="index-row__dot" style={{ background: dot }} />
      <span className="index-row__arrow">→</span>
    </button>
  );
}