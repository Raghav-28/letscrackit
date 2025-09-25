import { redirect } from "next/navigation";
import { Button } from "@/components/ui/button";
import { getCurrentUser } from "@/lib/actions/auth.action";
import { getAssessmentResult } from "@/lib/actions/assessment.action";

const Page = async ({ params }: { params: { sessionId: string } }) => {
  const user = await getCurrentUser();
  if (!user) redirect("/sign-in");

  const result = await getAssessmentResult(params.sessionId);
  if (!result) redirect("/");

  return (
    <section className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h3 className="text-2xl">Assessment Result</h3>
        <div className="bg-dark-200 px-3 py-1 rounded">Score: {result.scorePercent}%</div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="card p-5 bg-dark-200/40">
          <p>Total: {result.totalQuestions}</p>
          <p>Correct: {result.correct}</p>
          <p>Incorrect: {result.incorrect}</p>
          <p>Unanswered: {result.unanswered}</p>
        </div>
        <div className="card p-5 bg-dark-200/40">
          <h4 className="font-semibold mb-2">By Topic</h4>
          <ul className="text-sm">
            {result.topicBreakdown.map((t) => (
              <li key={t.topic}>{t.topic}: {t.correct}/{t.total}</li>
            ))}
          </ul>
        </div>
        <div className="card p-5 bg-dark-200/40">
          <h4 className="font-semibold mb-2">By Difficulty</h4>
          <ul className="text-sm">
            {result.difficultyBreakdown.map((d) => (
              <li key={d.difficulty}>{d.difficulty}: {d.correct}/{d.total}</li>
            ))}
          </ul>
        </div>
      </div>

      <div className="card p-5 bg-dark-200/40">
        <h4 className="font-semibold mb-2">AI Suggestions</h4>
        <div className="prose prose-invert bg-dark-200/40 rounded p-4" dangerouslySetInnerHTML={{ __html: result.aiSuggestions || "" }} />
      </div>

      <div className="flex gap-3">
        <Button className="btn-secondary" asChild>
          <a href="/">Back to dashboard</a>
        </Button>
        <Button className="btn" asChild>
          <a href="/assessment">Take another assessment</a>
        </Button>
      </div>
    </section>
  );
};

export default Page;


