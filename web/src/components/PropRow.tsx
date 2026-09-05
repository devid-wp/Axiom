interface Props {
  label: string;
  value: string;
}

export function PropRow({ label, value }: Props) {
  return (
    <div className="prop-row">
      <span className="prop-row__label">{label}</span>
      <span className="prop-row__value mono">{value}</span>
    </div>
  );
}