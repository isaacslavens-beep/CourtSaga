"use client";

import Image from "next/image";
import { useRouter, useSearchParams } from "next/navigation";
import { useState, useTransition } from "react";
import { QUIZ_LENGTH } from "../../diary/quiz";
import { Segmented } from "../../ui";
import { startQuiz } from "./actions";
import photo from "@/public/photos/djokovic-uso-2015.jpg";

/* Making a quiz: only which tour, men's unless picked otherwise. Every quiz is ten questions at a mix of levels picked for you, so
   there's nothing else to set. A link can carry the tour (a results page's "Another quiz"). */

type Tours = "atp" | "wta" | "both";

export function QuizMaker() {
  const params = useSearchParams();
  const t = params.get("t");
  return <Maker key={t ?? ""} initial={t === "wta" || t === "both" ? t : "atp"} />;
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
    <div className="mx-auto max-w-3xl">
      <section className="panel overflow-hidden" aria-labelledby="make-quiz">
        <Image src={photo} alt="Djokovic tapping his temple at the US Open" priority sizes="(min-width: 768px) 48rem, 100vw" className="h-48 w-full border-b border-line object-cover object-[50%_25%] sm:h-72" />
        <div className="panel-head">
          <h2 id="make-quiz" className="panel-title">
            Take a quiz
          </h2>
          <span className="panel-meta">A new one every time</span>
        </div>
        <div className="panel-body space-y-6">
          <p className="max-w-xl text-[0.9375rem] leading-snug">
            {QUIZ_LENGTH} questions, mostly on who won and who lost the finals of the big tournaments: the Slams, the 1000s, the tour finals and the Olympics. Two ask which of two champions leads their rivalry: just click one. One asks who won the most in a year, and one asks for a year or a number. Some are famous, some are obscure.
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
    </div>
  );
}
