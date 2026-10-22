import Link from "next/link";
import { SharedFrame, SharedHeading } from "./frame";

export default function SagaNotShared() {
  return (
    <SharedFrame heading={<SharedHeading title="This saga isn't shared" body="The link may have been turned off or replaced by a new one. Ask whoever sent it for the latest." />}>
      <p className="py-6 text-center">
        <Link href="/" className="inline-flex rounded-full bg-ball px-5 py-2.5 font-bold text-[#0b0d12] shadow-md">
          What&apos;s CourtSaga?
        </Link>
      </p>
    </SharedFrame>
  );
}
