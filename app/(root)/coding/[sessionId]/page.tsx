import { redirect } from "next/navigation";

import { getCurrentUser } from "@/lib/actions/auth.action";
import { getCodingProblems, getCodingSession } from "@/lib/actions/coding.action";
import CodingSession from "@/components/CodingSession";

const Page = async ({ params }: { params: { sessionId: string } }) => {
  const user = await getCurrentUser();
  if (!user) redirect("/sign-in");

  const session = await getCodingSession(params.sessionId);
  if (!session || session.userId !== user.id) redirect("/");

  const problems = await getCodingProblems(params.sessionId);

  return (
    <CodingSession
      sessionId={params.sessionId}
      userId={user.id}
      durationMinutes={session.durationMinutes}
      problems={problems as any}
    />
  );
};

export default Page;



