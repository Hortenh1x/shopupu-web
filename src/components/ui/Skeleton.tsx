export function Skeleton({ lines = 3, variant = "text" }: { lines?: number; variant?: "text" | "product" }) {
  if (variant === "product") {
    return (
      <div className="productCard" aria-hidden="true">
        <div className="skeletonBlock" style={{ aspectRatio: "4 / 5", borderRadius: 0 }} />
        <div className="productBody">
          <div className="skeletonBlock" style={{ height: 12, width: "38%" }} />
          <div className="skeletonBlock" style={{ height: 18, width: "82%" }} />
          <div className="skeletonBlock" style={{ height: 14, width: "30%" }} />
        </div>
      </div>
    );
  }

  return (
    <div className="card stack" aria-hidden="true">
      {Array.from({ length: lines }).map((_, index) => (
        <div
          key={index}
          className="skeletonBlock"
          style={{ height: index === 0 ? 26 : 14, width: `${88 - index * 14}%` }}
        />
      ))}
    </div>
  );
}
