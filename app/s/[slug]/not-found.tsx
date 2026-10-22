import Link from "next/link";
import { SagaCover, SagaKicker } from "../../saga-cover";
import { SharedFrame } from "./frame";

export default function SagaNotShared() {
  return (
    <SharedFrame>
      <SagaCover
        kicker={<SagaKicker>A saga, shared</SagaKicker>}
        title="This saga isn't shared"
        body="The link may have been turned off or replaced by a new one. Ask whoever sent it for the latest."
      />
      <p className="py-8 text-center">
        <Link href="/" className="inline-flex rounded-full bg-ball px-5 py-2.5 font-bold text-[#0b0d12] shadow-md">
          What&apos;s CourtSaga?
        </Link>
      </p>
    </SharedFrame>
  );
}
