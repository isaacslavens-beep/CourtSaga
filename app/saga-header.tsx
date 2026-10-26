import type { ReactNode } from "react";
import { CoverStats, PageBar } from "./ui";

/* The top of a saga someone else is reading (a shared link, or the admin's view): the page's bar with
   whose saga it is, what it is on the right, a line about it and its figures under it. The saga below
   opens in its quiet reading room (.saga-room), where the books do the talking. */
export function SagaHeader({ kicker, title, body, lines }: { kicker: string; title: string; body: ReactNode; lines?: string[] | null }) {
  return (
    <PageBar
      title={title}
      foot={
        <>
          <p className="max-w-3xl text-muted">{body}</p>
          {lines && lines.length > 0 && (
            <div className="mt-3">
              <CoverStats lines={lines} />
            </div>
          )}
        </>
      }
    >
      <span className="text-sm font-semibold text-muted">{kicker}</span>
    </PageBar>
  );
}
