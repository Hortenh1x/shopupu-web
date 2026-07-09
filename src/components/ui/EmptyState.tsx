import type { ReactNode } from "react";

export function EmptyState({ title, body, children }: { title: string; body?: string; children?: ReactNode }) {
  return (
    <div className="brutal stack" style={{ padding: "40px 32px", justifyItems: "start", gap: 10 }}>
      <h2 className="title" style={{ margin: 0 }}>
        {title}
      </h2>
      {body ? (
        <p className="subhead" style={{ margin: 0 }}>
          {body}
        </p>
      ) : null}
      {children ? (
        <div className="toolbar" style={{ marginTop: 8 }}>
          {children}
        </div>
      ) : null}
    </div>
  );
}
