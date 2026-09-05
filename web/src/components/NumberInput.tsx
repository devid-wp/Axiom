interface Props {
  label: string;
  value: string;
  onDec: () => void;
  onInc: () => void;
}

export function NumberInput({ label, value, onDec, onInc }: Props) {
  return (
    <div className="num-edit">
      <span className="num-edit__label">{label}</span>
      <span className="num-edit__value mono">{value}</span>
      <button className="num-edit__btn" onClick={onDec} aria-label={`${label} −`}>
        −
      </button>
      <button className="num-edit__btn" onClick={onInc} aria-label={`${label} +`}>
        +
      </button>
    </div>
  );
}