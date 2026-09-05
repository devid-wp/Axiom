import type { ReactNode } from "react";

interface Props {
  icon: ReactNode;
  label: string;
  keyHint?: string;
  active: boolean;
  onClick: () => void;
}

export function ToolButton({ icon, label, keyHint, active, onClick }: Props) {
  return (
    <button
      className={active ? "tool-row tool-row--active" : "tool-row"}
      onClick={onClick}
      title={keyHint ? `${label} — ${keyHint}` : label}
    >
      <span className="tool-row__edge" />
      <span className="tool-row__icon">{icon}</span>
      <span className="tool-row__label">{label}</span>
      {keyHint && <span className="tool-row__key">{keyHint}</span>}
    </button>
  );
}