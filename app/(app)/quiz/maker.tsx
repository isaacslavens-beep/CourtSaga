"use client";

import Image from "next/image";
import { useRouter, useSearchParams } from "next/navigation";
import { useState, useTransition } from "react";
import { QUIZ_LENGTH } from "../../diary/quiz";
import { Segmented } from "../../ui";
import { startQuiz } from "./actions";
import photo from "@/public/photos/djokovic-uso-2015.jpg";

/* Making a quiz: only which tour. Every quiz is ten questions at a mix of levels picked for you, so
   there's nothing else to set. A link can carry the tour (a results page's "Another quiz"). */

type Tours = "atp" | "wta" | "both";

export function QuizMaker() {
  const params = useSearchParams();
  const t = params.get("t");
  return <Maker key={t ?? ""} initial={t === "atp" || t === "wta" ? t : "both"} />;
}

function Maker({ initial }: { initial: Tours }) {
  const router = useRouter();
  const [tours, setTours] = useState<Tours>(initial);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  const go = () =>
    start(async () => {
      setError(null);
      try {
        const res = await startQuiz({ tours: tours === "both" ? ["atp", "wta"] : [tours] });
        if ("error" in res) setError(res.error);
        else router.push(`/quiz/${res.id}`);
      } catch {
        setError("The quiz couldn't be made just now. Try again in a moment.");
      }
    });

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_20rem]">
      <section className="panel overflow-hidden" aria-labelledby="make-quiz">
        <Image src={photo} alt="Djokovic tapping his temple at the US Open" priority sizes="(min-width: 1024px) 44rem, 100vw" className="h-48 w-full border-b border-line object-cover object-[50%_25%] sm:h-72" />
        <div className="panel-head">
          <h2 id="make-quiz" className="panel-title">
            Take a quiz
          </h2>
          <span className="panel-meta">A new one every time</span>
        </div>
        <div className="panel-body space-y-6">
          <p className="max-w-xl text-[0.9375rem] leading-snug">
            {QUIZ_LENGTH} questions, mostly on who won and who lost the finals of the big tournaments: the Slams, the 1000s, the tour finals and the Olympics. A few are odder, like who won the most titles in a year or who leads a rivalry, and one asks for a year or a number. Some are famous, some are obscure.
          </p>
          <div>
            <span className="mb-2 block text-sm font-semibold">Tour</span>
            <Segmented
              label="Tour"
              options={[
                { id: "atp", label: "Men" },
                { id: "wta", label: "Women" },
                { id: "both", label: "Both" },
              ]}
              value={tours}
              onChange={setTours}
            />
          </div>
          <div className="flex flex-wrap items-center gap-4 border-t border-line pt-5">
            <button type="button" onClick={go} disabled={pending} className="btn btn-primary btn-lg">
              {pending ? "Writing the quiz…" : "Start the quiz"}
            </button>
            {error && (
              <p role="alert" className="font-medium text-fault">
                {error}
              </p>
            )}
          </div>
        </div>
      </section>

      <aside className="panel self-start" aria-labelledby="how-quiz">
        <div className="panel-head">
          <h2 id="how-quiz" className="panel-title">
            How it works
          </h2>
        </div>
        <ul className="panel-body space-y-3 text-[0.9375rem] leading-snug">
          <li>
            <strong>Type the answer.</strong> For a player, pick the name from the list that comes up as you type, so spelling doesn&apos;t matter.
          </li>
          <li>
            <strong>Every question comes from the data</strong>: every tour-level singles final since 2003.
          </li>
          <li>
            <strong>Then share the results.</strong> Anyone with the link sees the score and every answer, and can take the same questions.
          </li>
        </ul>
      </aside>
    </div>
  );
}
