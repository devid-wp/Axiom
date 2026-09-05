interface Props {
  name: string;
  kind: string;
  dot: string;
  selected: boolean;
  onClick: () => void;
}

export function TreeRow({ name, kind, dot, selected, onClick }: Props) {
  return (
    <button className={selected ? "tree-row tree-row--active" : "tree-row"} onClick={onClick}>
      <span className="tree-row__dot" style={{ background: dot }} />
      <span className="tree-row__name">{name}</span>
      <span className="tree-row__spacer" />
      <span className="tree-row__kind mono">{kind}</span>
      <span className="tree-row__sel" />
    </button>
  );
}