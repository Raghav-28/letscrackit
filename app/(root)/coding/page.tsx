import { redirect } from "next/navigation";
import { z } from "zod";

import { Button } from "@/components/ui/button";
import { getCurrentUser } from "@/lib/actions/auth.action";
import { createCodingSession } from "@/lib/actions/coding.action";
import { CODING_TOPICS, ASSESSMENT_DIFFICULTIES, DEFAULT_ASSESSMENT_DURATION_MIN, DEFAULT_ASSESSMENT_NUM_QUESTIONS } from "@/constants";

const schema = z.object({
  topics: z.string(), // comma-separated
  durationMinutes: z.coerce.number().min(5).max(180),
  numQuestions: z.coerce.number().min(1).max(20),
  difficulty: z.enum(["easy", "medium", "hard", "mixed"]),
});

const Page = async () => {
  const user = await getCurrentUser();
  if (!user) redirect("/sign-in");

  async function action(formData: FormData) {
    "use server";
    const topicsSelected = formData.getAll("topics").map(String);
    const values = {
      topics: topicsSelected.join(","),
      durationMinutes: formData.get("durationMinutes") || "",
      numQuestions: formData.get("numQuestions") || "",
      difficulty: formData.get("difficulty") || "mixed",
    } as any;
    const parsed = schema.safeParse(values);
    if (!parsed.success) return;
    const { durationMinutes, numQuestions, difficulty } = parsed.data as any;
    const res = await createCodingSession({
      userId: user.id,
      topics: topicsSelected,
      durationMinutes: Number(durationMinutes),
      numQuestions: Number(numQuestions),
      difficulty: difficulty as any,
    });
    if (res.success) redirect(`/coding/${res.sessionId}`);
  }

  return (
    <section className="card-border lg:min-w-[566px]">
      <div className="card py-10 px-8 flex flex-col gap-6">
        <h3>Create Coding Assessment</h3>
        <form action={action} className="form space-y-6">
          <div className="space-y-3">
            <label className="label text-base">Topics</label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {CODING_TOPICS.map((t) => (
                <label key={t} className="flex items-center gap-3 p-2 rounded bg-dark-200/40 hover:bg-dark-200/60 cursor-pointer">
                  <input type="checkbox" name="topics" value={t} />
                  <span className="text-base">{t}</span>
                </label>
              ))}
            </div>
            <p className="text-xs text-gray-400">Select one or more topics</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <div>
              <label className="label">Duration (minutes)</label>
              <input
                className="input"
                type="number"
                name="durationMinutes"
                defaultValue={DEFAULT_ASSESSMENT_DURATION_MIN}
                min={5}
                max={180}
              />
            </div>
            <div>
              <label className="label">Number of Problems</label>
              <input
                className="input"
                type="number"
                name="numQuestions"
                defaultValue={Math.min(5, DEFAULT_ASSESSMENT_NUM_QUESTIONS)}
                min={1}
                max={20}
              />
            </div>
          </div>

          <div>
            <label className="label">Difficulty</label>
            <select className="input" name="difficulty" defaultValue="mixed">
              {ASSESSMENT_DIFFICULTIES.map((d) => (
                <option key={d} value={d}>
                  {d}
                </option>
              ))}
            </select>
          </div>

          <Button className="btn" type="submit">
            Start Coding Assessment
          </Button>
        </form>
      </div>
    </section>
  );
};

export default Page;


