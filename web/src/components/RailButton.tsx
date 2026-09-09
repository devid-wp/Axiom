import type { ReactNode } from "react";

interface Props {
  icon: ReactNode;
  active: boolean;
  onClick: () => void;
  title?: string;
}

export function RailButton({ icon, active, onClick, title }: Props) {
  return (
    <button
      className={active ? "rail-btn rail-btn--active" : "rail-btn"}
      onClick={onClick}
      title={title}
      aria-current={active ? "page" : undefined}
    >
      <span className="rail-btn__edge" />
      <span className="rail-btn__icon">{icon}</span>
    </button>
  );
}
