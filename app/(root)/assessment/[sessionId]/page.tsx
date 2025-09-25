"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { Button } from "@/components/ui/button";

async function fetchQuestions(sessionId: string) {
  const res = await fetch(`/api/assessment/${sessionId}/questions`, { cache: "no-store" });
  return (await res.json()).data as Omit<AssessmentQuestion, "correctChoiceId">[];
}

async function submit(sessionId: string, answers: Array<{ questionId: string; choiceId: string | null }>, reason: string) {
  await fetch(`/api/assessment/${sessionId}/submit`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ answers, reason }),
  });
}

const LOADER_MESSAGES = [
  "Be ready to face the challenge",
  "One step closer towards improvement",
  "Preparing your personalized questions",
  "Sharpening the pencils...",
  "Almost there",
];

export default function Runner({ params }: { params: { sessionId: string } }) {
  const router = useRouter();
  const sessionId = params.sessionId;
  const [questions, setQuestions] = useState<Omit<AssessmentQuestion, "correctChoiceId">[]>([]);
  const [answers, setAnswers] = useState<Record<string, string | null>>({});
  const [secondsLeft, setSecondsLeft] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(true);
  const [msgIndex, setMsgIndex] = useState<number>(0);
  const fullScreenRequested = useRef(false);

  useEffect(() => {
    let mounted = true;
    fetchQuestions(sessionId).then((qs) => {
      if (!mounted) return;
      setQuestions(qs);
      setAnswers(Object.fromEntries(qs.map((q) => [q.id, null])));
      setLoading(false);
    });
    // TODO: fetch actual duration from session header endpoint; fallback to 20m
    setSecondsLeft(20 * 60);

    const id = setInterval(() => setMsgIndex((i) => (i + 1) % LOADER_MESSAGES.length), 1800);
    return () => {
      mounted = false;
      clearInterval(id);
    };
  }, [sessionId]);

  useEffect(() => {
    const id = setInterval(() => setSecondsLeft((s) => (s > 0 ? s - 1 : 0)), 1000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    if (secondsLeft === 0 && questions.length) {
      handleSubmit("timeout");
    }
  }, [secondsLeft, questions.length]);

  useEffect(() => {
    if (!fullScreenRequested.current) {
      document.documentElement.requestFullscreen?.().catch(() => {});
      fullScreenRequested.current = true;
    }
    const onVisibility = () => {
      if (document.hidden) {
        handleSubmit("proctor_violation");
      }
    };
    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("blur", onVisibility);
    return () => {
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("blur", onVisibility);
    };
  }, []);

  const timeStr = useMemo(() => {
    const m = Math.floor(secondsLeft / 60);
    const s = secondsLeft % 60;
    return `${m}:${s.toString().padStart(2, "0")}`;
  }, [secondsLeft]);

  async function handleSubmit(reason: "user_submit" | "timeout" | "proctor_violation" = "user_submit") {
    const arr = Object.entries(answers).map(([questionId, choiceId]) => ({ questionId, choiceId }));
    await submit(sessionId, arr, reason);
    router.push(`/assessment/${sessionId}/result`);
  }

  if (loading) {
    return (
      <section className="min-h-[60vh] flex items-center justify-center">
        <div className="card-border w-full max-w-lg">
          <div className="card bg-dark-200/40 p-8 flex flex-col items-center gap-4 text-center">
            <div className="relative h-16 w-16">
              <Image src="/robot.png" alt="loading" fill className="object-contain animate-pulse" />
            </div>
            <p className="text-lg font-semibold">{LOADER_MESSAGES[msgIndex]}</p>
            <div className="flex items-center gap-2 text-sm text-gray-300">
              <span className="inline-block h-2 w-2 rounded-full bg-primary-200 animate-bounce"></span>
              <span className="inline-block h-2 w-2 rounded-full bg-primary-200 animate-bounce [animation-delay:150ms]"></span>
              <span className="inline-block h-2 w-2 rounded-full bg-primary-200 animate-bounce [animation-delay:300ms]"></span>
            </div>
            <p className="text-xs text-gray-400">Preparing your test. This may take a few seconds…</p>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="flex flex-col gap-6">
      <div className="sticky top-0 z-10 bg-dark-100/80 backdrop-blur border-b border-dark-200">
        <div className="max-w-4xl mx-auto px-4 py-3 flex items-center justify-between">
          <h3 className="text-xl">Aptitude Assessment</h3>
          <div className="bg-dark-200 px-3 py-1 rounded">Time left: {timeStr}</div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto w-full px-4 flex flex-col gap-4">
        {questions.map((q, idx) => (
          <div key={q.id} className="card p-5 bg-dark-200/40">
            <p className="font-semibold mb-3 text-base">{idx + 1}. {q.question}</p>
            <div className="flex flex-col gap-2">
              {q.choices.map((c) => (
                <label key={c.id} className="flex items-center gap-3 p-2 rounded hover:bg-dark-200/60 cursor-pointer">
                  <input
                    type="radio"
                    name={q.id}
                    value={c.id}
                    checked={answers[q.id] === c.id}
                    onChange={() => setAnswers((prev) => ({ ...prev, [q.id]: c.id }))}
                  />
                  <span className="text-base">{c.id}. {c.text}</span>
                </label>
              ))}
            </div>
          </div>
        ))}

        <div className="flex justify-end py-4">
          <Button className="btn" onClick={() => handleSubmit("user_submit")}>Submit</Button>
        </div>
      </div>
    </section>
  );
}


