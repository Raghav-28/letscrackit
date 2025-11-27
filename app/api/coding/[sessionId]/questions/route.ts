import { NextRequest } from "next/server";
import { getCodingProblems } from "@/lib/actions/coding.action";

export async function GET(_req: NextRequest, { params }: { params: { sessionId: string } }) {
  const data = await getCodingProblems(params.sessionId);
  return Response.json({ success: true, data }, { status: 200 });
}



