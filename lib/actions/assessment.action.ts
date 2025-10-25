"use server";

import { z } from "zod";
import { generateObject } from "ai";
import { google } from "@ai-sdk/google";

import { db } from "@/firebase/admin";
import { getCurrentUser } from "@/lib/actions/auth.action";

const ChoiceSchema = z.object({ id: z.string(), text: z.string() });
const QuestionSchema = z.object({
  id: z.string(),
  topic: z.string(),
  difficulty: z.enum(["easy", "medium", "hard"]),
  question: z.string(),
  choices: z.array(ChoiceSchema).min(2),
  correctChoiceId: z.string(),
  explanation: z.string().optional(),
});

const QuestionsArraySchema = z.array(QuestionSchema);

export async function createAssessmentSession(params: CreateAssessmentParams) {
  const user = await getCurrentUser();
  const userId = user?.id || params.userId;
  if (!userId) return { success: false, message: "Not authenticated" };

  const { topics, numQuestions, durationMinutes, difficulty } = params;

  const sessionRef = db.collection("assessmentSessions").doc();
  const session: AssessmentSession = {
    id: sessionRef.id,
    userId,
    topics,
    numQuestions,
    durationMinutes,
    difficulty,
    createdAt: new Date().toISOString(),
    status: "pending",
  };

  await sessionRef.set(session);

  const topicStr = topics.join(", ");

  const { object } = await generateObject({
    model: google("gemini-2.0-flash-001", { structuredOutputs: false }),
    schema: QuestionsArraySchema,
    prompt: `Generate ${numQuestions} multiple-choice questions strictly in JSON array (no pre/post text).
Topics: ${topicStr}
Difficulty: ${difficulty} (if 'mixed', vary evenly).
For each question include: id (short unique), topic, difficulty (easy|medium|hard), question, choices (A..D with text), correctChoiceId (one of choice ids), explanation (1-2 lines).
Keep language concise; no code unless topic requires.
Return ONLY JSON array.`,
  });

  const questions: AssessmentQuestion[] = object as any;

  const batch = db.batch();
  const questionsCol = sessionRef.collection("questions");
  questions.forEach((q) => {
    const doc = questionsCol.doc(q.id);
    batch.set(doc, q);
  });

  batch.update(sessionRef, { status: "active" });
  await batch.commit();

  return { success: true, sessionId: session.id };
}

export async function getAssessmentSession(sessionId: string) {
  const doc = await db.collection("assessmentSessions").doc(sessionId).get();
  if (!doc.exists) return null;
  return { id: doc.id, ...doc.data() } as AssessmentSession;
}

export async function getAssessmentQuestions(sessionId: string) {
  const snapshot = await db
    .collection("assessmentSessions")
    .doc(sessionId)
    .collection("questions")
    .get();

  const questions = snapshot.docs.map((d) => d.data() as AssessmentQuestion);
  // Remove correctChoiceId before sending to client
  return questions.map(({ correctChoiceId, ...rest }) => rest);
}

export async function submitAssessment(params: SubmitAssessmentParams) {
  const { sessionId, userId, answers, reason = "user_submit" } = params;
  const session = await getAssessmentSession(sessionId);
  if (!session || session.userId !== userId) {
    return { success: false, message: "Invalid session" };
  }

  // Load questions with answers
  const snapshot = await db
    .collection("assessmentSessions")
    .doc(sessionId)
    .collection("questions")
    .get();
  const questions = snapshot.docs.map((d) => d.data() as AssessmentQuestion);

  const answerMap = new Map(answers.map((a) => [a.questionId, a.choiceId]));
  let correct = 0;
  let incorrect = 0;
  let unanswered = 0;

  const topicTally = new Map<string, { correct: number; total: number }>();
  const diffTally = new Map<string, { correct: number; total: number }>();

  questions.forEach((q) => {
    const given = answerMap.get(q.id) ?? null;
    const isCorrect = given !== null && given === q.correctChoiceId;
    if (given === null) unanswered += 1;
    else if (isCorrect) correct += 1;
    else incorrect += 1;

    const t = topicTally.get(q.topic) || { correct: 0, total: 0 };
    t.total += 1;
    if (isCorrect) t.correct += 1;
    topicTally.set(q.topic, t);

    const d = diffTally.get(q.difficulty) || { correct: 0, total: 0 };
    d.total += 1;
    if (isCorrect) d.correct += 1;
    diffTally.set(q.difficulty, d);
  });

  const totalQuestions = questions.length;
  const scorePercent = totalQuestions > 0 ? Math.round((correct / totalQuestions) * 100) : 0;

  const topicBreakdown = Array.from(topicTally.entries()).map(([topic, v]) => ({
    topic,
    correct: v.correct,
    total: v.total,
  }));

  const difficultyBreakdown = Array.from(diffTally.entries()).map(
    ([difficulty, v]) => ({
      difficulty: difficulty as any,
      correct: v.correct,
      total: v.total,
    })
  );

  const result: AssessmentResultSummary = {
    sessionId,
    userId,
    totalQuestions,
    correct,
    incorrect,
    unanswered,
    scorePercent,
    topicBreakdown,
    difficultyBreakdown,
    createdAt: new Date().toISOString(),
  };

  // Generate AI suggestions
  const { text: suggestions } = await generateObject({
    model: google("gemini-2.0-flash-001"),
    schema: z.string(),
    prompt: `Provide concise, actionable study advice (bulleted) for a student based on this test summary:
Score: ${scorePercent}% (Correct ${correct}/${totalQuestions})
Topic breakdown: ${JSON.stringify(topicBreakdown)}
Difficulty breakdown: ${JSON.stringify(difficultyBreakdown)}
Keep it 6-10 bullets, include links (markdown) to high quality resources.`,
  } as any);

  result.aiSuggestions = String(suggestions);

  const sessionRef = db.collection("assessmentSessions").doc(sessionId);
  const resultRef = sessionRef.collection("results").doc("latest");
  await resultRef.set(result);
  await sessionRef.update({ status: reason === "proctor_violation" ? "autofailed" : "submitted" });

  return { success: true, resultId: resultRef.id };
}

export async function getAssessmentResult(sessionId: string) {
  const resultDoc = await db
    .collection("assessmentSessions")
    .doc(sessionId)
    .collection("results")
    .doc("latest")
    .get();
  if (!resultDoc.exists) return null;
  return resultDoc.data() as AssessmentResultSummary;
}



