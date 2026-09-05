interface Props {
  text: string;
  active: boolean;
  onClick: () => void;
}

export function SegTab({ text, active, onClick }: Props) {
  return (
    <button className={active ? "seg-tab seg-tab--active" : "seg-tab"} onClick={onClick}>
      <span className="seg-tab__label">{text}</span>
      <span className="seg-tab__bar" />
    </button>
  );
}