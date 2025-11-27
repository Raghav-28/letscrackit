"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";

type ClientProblem = Omit<CodingProblem, "testCases">;

interface Props {
  sessionId: string;
  userId: string;
  durationMinutes: number;
  problems: ClientProblem[];
}

const CodingSession = ({ sessionId, userId, durationMinutes, problems }: Props) => {
  const router = useRouter();
  const [remaining, setRemaining] = useState(durationMinutes * 60);
  const [language, setLanguage] = useState<"java" | "cpp">("java");
  const [active, setActive] = useState(0);
  const [codes, setCodes] = useState<Record<string, string>>({});
  const timerRef = useRef<number | null>(null);

  const formattedTime = useMemo(() => {
    const m = Math.floor(remaining / 60).toString().padStart(2, "0");
    const s = (remaining % 60).toString().padStart(2, "0");
    return `${m}:${s}`;
  }, [remaining]);

  useEffect(() => {
    // Start fullscreen and timer
    const el = document.documentElement;
    el.requestFullscreen?.();

    const onFsChange = () => {
      if (!document.fullscreenElement) {
        // Auto submit on exit
        handleSubmit("proctor_violation");
      }
    };
    document.addEventListener("fullscreenchange", onFsChange);

    timerRef.current = window.setInterval(() => {
      setRemaining((r) => {
        if (r <= 1) {
          window.clearInterval(timerRef.current!);
          handleSubmit("timeout");
          return 0;
        }
        return r - 1;
      });
    }, 1000);

    return () => {
      document.removeEventListener("fullscreenchange", onFsChange);
      if (timerRef.current) window.clearInterval(timerRef.current);
    };
  }, []);

  const handleChangeCode = (problemId: string, value: string) => {
    setCodes((prev) => ({ ...prev, [problemId]: value }));
  };

  const handleSubmit = async (reason: "user_submit" | "timeout" | "proctor_violation" = "user_submit") => {
    try {
      const payload = {
        language,
        answers: problems.map((p) => ({ problemId: p.id, code: codes[p.id] || "" })),
        reason,
      };
      const res = await fetch(`/api/coding/${sessionId}/submit`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (res.ok) {
        router.replace(`/coding/${sessionId}/result`);
      } else {
        router.replace("/");
      }
    } catch {
      router.replace("/");
    }
  };

  const p = problems[active];

  return (
    <section className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <div className="flex gap-2">
          {problems.map((pb, idx) => (
            <button key={pb.id} className={`px-3 py-1 rounded ${idx === active ? "bg-dark-200" : "bg-dark-200/40"}`} onClick={() => setActive(idx)}>
              {idx + 1}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-3">
          <select className="input" value={language} onChange={(e) => setLanguage(e.target.value as any)}>
            <option value="java">Java</option>
            <option value="cpp">C++</option>
          </select>
          <div className="bg-dark-200 px-3 py-1 rounded font-mono">{formattedTime}</div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="card p-4 bg-dark-200/40">
          <h4 className="text-lg font-semibold">{p.title}</h4>
          <p className="mt-2 whitespace-pre-wrap">{p.description}</p>
          {p.inputFormat && (
            <>
              <h5 className="mt-3 font-semibold">Input</h5>
              <p className="whitespace-pre-wrap">{p.inputFormat}</p>
            </>
          )}
          {p.outputFormat && (
            <>
              <h5 className="mt-3 font-semibold">Output</h5>
              <p className="whitespace-pre-wrap">{p.outputFormat}</p>
            </>
          )}
          {p.constraints && (
            <>
              <h5 className="mt-3 font-semibold">Constraints</h5>
              <p className="whitespace-pre-wrap">{p.constraints}</p>
            </>
          )}
          <h5 className="mt-3 font-semibold">Function Signature</h5>
          <pre className="bg-dark-200 rounded p-3 overflow-auto text-sm whitespace-pre-wrap">{p.functionSignature}</pre>
          <h5 className="mt-3 font-semibold">Examples</h5>
          <div className="space-y-2">
            {p.examples.map((ex, i) => (
              <div key={i} className="bg-dark-200 rounded p-3">
                <div className="text-sm"><b>Input:</b> {ex.input}</div>
                <div className="text-sm"><b>Output:</b> {ex.output}</div>
                {ex.explanation && <div className="text-sm opacity-80"><b>Explanation:</b> {ex.explanation}</div>}
              </div>
            ))}
          </div>
        </div>

        <div className="card p-4 bg-dark-200/40">
          <textarea
            className="input min-h-[420px] font-mono"
            placeholder={`Write your ${language.toUpperCase()} solution here...`}
            value={codes[p.id] || ""}
            onChange={(e) => handleChangeCode(p.id, e.target.value)}
          />
          <div className="flex justify-end mt-3">
            <button className="btn" onClick={() => handleSubmit("user_submit")}>Submit Assessment</button>
          </div>
        </div>
      </div>
    </section>
  );
};

export default CodingSession;



