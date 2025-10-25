import { NextRequest } from "next/server";
import { getCurrentUser } from "@/lib/actions/auth.action";
import { submitAssessment } from "@/lib/actions/assessment.action";

export async function POST(req: NextRequest, { params }: { params: { sessionId: string } }) {
  const user = await getCurrentUser();
  if (!user) return Response.json({ success: false, message: "Unauthorized" }, { status: 401 });
  const body = await req.json();
  const res = await submitAssessment({
    sessionId: params.sessionId,
    userId: user.id,
    answers: body.answers || [],
    reason: body.reason || "user_submit",
  });
  return Response.json(res, { status: res.success ? 200 : 400 });
}



