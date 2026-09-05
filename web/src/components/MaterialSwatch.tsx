interface Props {
  label: string;
  swatch: string;
  active: boolean;
  onClick: () => void;
}

export function MaterialSwatch({ label, swatch, active, onClick }: Props) {
  return (
    <button className={active ? "swatch swatch--active" : "swatch"} onClick={onClick}>
      <span className="swatch__chip" style={{ background: swatch }} />
      <span className="swatch__label">{label}</span>
      <span className="swatch__spacer" />
      <span className="swatch__radio" />
    </button>
  );
}