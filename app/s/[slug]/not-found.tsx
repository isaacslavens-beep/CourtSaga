import Link from "next/link";
import { SagaHeader } from "../../saga-header";
import { Room, SharedFrame } from "./frame";

export default function SagaNotShared() {
  return (
    <SharedFrame>
      <SagaHeader
        kicker="A saga, shared"
        title="This saga isn't shared"
        body="The link may have been turned off or replaced by a new one. Ask whoever sent it for the latest."
      />
      <Room>
        <p className="py-4 text-center">
          <Link href="/" className="btn btn-primary btn-lg">
            What&apos;s CourtSaga?
          </Link>
        </p>
      </Room>
    </SharedFrame>
  );
}
