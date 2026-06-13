import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function getSessionUser() {
  const session = await auth();
  return session?.user?.id ? session.user : null;
}

export async function assertProjectOwner(projectId: string, userId: string) {
  const project = await prisma.project.findUnique({
    where: { id: projectId },
    select: { userId: true },
  });
  if (!project) {
    return { error: NextResponse.json({ error: "Not found" }, { status: 404 }) };
  }
  if (project.userId !== userId) {
    return { error: NextResponse.json({ error: "Forbidden" }, { status: 403 }) };
  }
  return { error: null };
}
