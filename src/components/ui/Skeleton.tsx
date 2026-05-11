export function Skeleton({ lines = 3 }: { lines?: number }) {
  return (
    <div className="card stack">
      {Array.from({ length: lines }).map((_, index) => (
        <div
          key={index}
          style={{
            height: index === 0 ? 30 : 16,
            width: `${90 - index * 12}%`,
            background: "linear-gradient(90deg, var(--color-concrete), var(--color-panel-raised))",
            border: "1px solid var(--color-border-soft)",
            borderRadius: 12
          }}
        />
      ))}
    </div>
  );
}
