import { NextRequest } from "next/server";
import { getAssessmentQuestions } from "@/lib/actions/assessment.action";

export async function GET(_req: NextRequest, { params }: { params: { sessionId: string } }) {
  const data = await getAssessmentQuestions(params.sessionId);
  return Response.json({ success: true, data }, { status: 200 });
}



