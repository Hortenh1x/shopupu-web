import type { ReactNode } from "react";

export function EmptyState({ title, body, children }: { title: string; body?: string; children?: ReactNode }) {
  return (
    <div className="page">
      <div className="brutal stack" style={{ padding: 28 }}>
        <h1 className="title">{title}</h1>
        {body ? <p className="subhead muted">{body}</p> : null}
        {children ? <div className="toolbar">{children}</div> : null}
      </div>
    </div>
  );
}
