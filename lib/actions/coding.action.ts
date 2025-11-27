"use server";

import { z } from "zod";
import { generateObject, generateText } from "ai";
import { google } from "@ai-sdk/google";

import { db } from "@/firebase/admin";
import { getCurrentUser } from "@/lib/actions/auth.action";

const ExampleSchema = z.object({ input: z.string(), output: z.string(), explanation: z.string().optional() });
const TestCaseSchema = z.object({ input: z.string(), output: z.string() });

const CodingProblemSchema = z.object({
  id: z.string(),
  topic: z.string(),
  difficulty: z.enum(["easy", "medium", "hard"]),
  title: z.string(),
  description: z.string(),
  functionSignature: z.string(),
  inputFormat: z.string().optional(),
  outputFormat: z.string().optional(),
  constraints: z.string().optional(),
  examples: z.array(ExampleSchema).min(1),
  testCases: z.array(TestCaseSchema).min(3),
});

const CodingProblemsArraySchema = z.array(CodingProblemSchema);

export async function createCodingSession(params: CreateCodingParams) {
  const user = await getCurrentUser();
  const userId = user?.id || params.userId;
  if (!userId) return { success: false, message: "Not authenticated" };

  const { topics, numQuestions, durationMinutes, difficulty } = params;

  const sessionRef = db.collection("codingSessions").doc();
  const session: CodingSession = {
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
    schema: CodingProblemsArraySchema,
    prompt: `Generate ${numQuestions} coding problems for topics [${topicStr}] with difficulty ${difficulty} (if 'mixed', vary).
Each problem must have fields: id (short unique), topic, difficulty (easy|medium|hard), title, description (clear statement), functionSignature (Java OR C++), inputFormat, outputFormat, constraints, examples (>=1 with input, output, explanation), and testCases (>=3) with simple I/O.
Keep statements concise and unambiguous. Avoid external libs. Ensure deterministic outputs.`,
  });

  const problems: CodingProblem[] = object as any;

  const batch = db.batch();
  const problemsCol = sessionRef.collection("problems");
  problems.forEach((p) => {
    const doc = problemsCol.doc(p.id);
    batch.set(doc, p);
  });
  batch.update(sessionRef, { status: "active" });
  await batch.commit();

  return { success: true, sessionId: session.id };
}

export async function getCodingSession(sessionId: string) {
  const doc = await db.collection("codingSessions").doc(sessionId).get();
  if (!doc.exists) return null;
  return { id: doc.id, ...doc.data() } as CodingSession;
}

export async function getCodingProblems(sessionId: string) {
  const snapshot = await db
    .collection("codingSessions")
    .doc(sessionId)
    .collection("problems")
    .get();

  const problems = snapshot.docs.map((d) => d.data() as CodingProblem);
  // Hide test cases from client during session
  return problems.map(({ testCases, ...rest }) => rest);
}

export async function submitCoding(params: SubmitCodingParams) {
  const { sessionId, userId, answers, language, reason = "user_submit" } = params;
  const session = await getCodingSession(sessionId);
  if (!session || session.userId !== userId) {
    return { success: false, message: "Invalid session" };
  }

  // Load full problems including testcases
  const snapshot = await db
    .collection("codingSessions")
    .doc(sessionId)
    .collection("problems")
    .get();
  const problems = snapshot.docs.map((d) => d.data() as CodingProblem);

  // Build map for quick lookup
  const codeByProblem = new Map(answers.map((a) => [a.problemId, a.code]));

  const evaluations: CodingProblemEvaluation[] = [];
  const topicTally = new Map<string, { passed: number; total: number }>();
  const diffTally = new Map<string, { passed: number; total: number }>();

  for (const problem of problems) {
    const code = codeByProblem.get(problem.id) || "";
    const total = problem.testCases?.length || 0;

    const { object } = await generateObject({
      model: google("gemini-2.0-flash-001", { structuredOutputs: false }),
      schema: z.object({
        passed: z.number(),
        total: z.number(),
        feedback: z.string().optional(),
      }),
      prompt: `You are a strict coding judge. Given a problem and user code in ${language.toUpperCase()}, simulate compilation and running against the provided test cases. Count how many pass based on exact matches of stdout. Be deterministic.

Problem Title: ${problem.title}
Description: ${problem.description}
Function Signature: ${problem.functionSignature}
Test Cases (JSON): ${JSON.stringify(problem.testCases)}

User Code (${language}):\n${code}

Return JSON with passed, total, feedback.`,
    });

    const passed = Math.max(0, Math.min(object.passed || 0, total));
    evaluations.push({ problemId: problem.id, passed, total, feedback: object.feedback });

    const tt = topicTally.get(problem.topic) || { passed: 0, total: 0 };
    tt.passed += passed;
    tt.total += total;
    topicTally.set(problem.topic, tt);

    const dt = diffTally.get(problem.difficulty) || { passed: 0, total: 0 };
    dt.passed += passed;
    dt.total += total;
    diffTally.set(problem.difficulty, dt);
  }

  const totalProblems = problems.length;
  const totalPassed = evaluations.reduce((s, e) => s + e.passed, 0);
  const totalTestCases = evaluations.reduce((s, e) => s + e.total, 0);
  const scorePercent = totalTestCases > 0 ? Math.round((totalPassed / totalTestCases) * 100) : 0;

  const topicBreakdown = Array.from(topicTally.entries()).map(([topic, v]) => ({ topic, passed: v.passed, total: v.total }));
  const difficultyBreakdown = Array.from(diffTally.entries()).map(([difficulty, v]) => ({ difficulty: difficulty as any, passed: v.passed, total: v.total }));

  const result: CodingResultSummary = {
    sessionId,
    userId,
    totalProblems,
    totalPassed,
    totalTestCases,
    scorePercent,
    topicBreakdown,
    difficultyBreakdown,
    createdAt: new Date().toISOString(),
    evaluations,
  };

  // AI Suggestions based on weak areas
  const { text: suggestions } = await generateText({
    model: google("gemini-2.0-flash-001"),
    prompt: `Provide concise, actionable coding practice advice (markdown bullet list) for this coding test result.
Score: ${scorePercent}% (${totalPassed}/${totalTestCases} test cases)
Topic breakdown: ${JSON.stringify(topicBreakdown)}
Difficulty breakdown: ${JSON.stringify(difficultyBreakdown)}
Constraints: 6-10 bullets, prioritize weakest topics, include specific patterns (two pointers, sliding window, recursion vs DP choice), and optionally add links in markdown. Keep one sentence per bullet.`,
  });
  result.aiSuggestions = suggestions;

  const sessionRef = db.collection("codingSessions").doc(sessionId);
  const resultRef = sessionRef.collection("results").doc("latest");
  await resultRef.set(result);
  await sessionRef.update({ status: reason === "proctor_violation" ? "autofailed" : "submitted" });

  return { success: true, resultId: resultRef.id };
}

export async function getCodingResult(sessionId: string) {
  const resultDoc = await db
    .collection("codingSessions")
    .doc(sessionId)
    .collection("results")
    .doc("latest")
    .get();
  if (!resultDoc.exists) return null;
  return resultDoc.data() as CodingResultSummary;
}



