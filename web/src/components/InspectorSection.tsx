import { useState, type ReactNode } from "react";

interface Props {
  title: string;
  children: ReactNode;
  defaultOpen?: boolean;
}

export function InspectorSection({ title, children, defaultOpen = true }: Props) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="prop-group">
      <button className="prop-group__head" onClick={() => setOpen((o) => !o)}>
        <span className="prop-group__caret">{open ? "▾" : "▸"}</span>
        <span className="prop-group__title">{title}</span>
      </button>
      {open && <div className="prop-group__body">{children}</div>}
    </div>
  );
}