import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUser, assertProjectOwner } from "@/lib/auth-helpers";

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const { error } = await assertProjectOwner(id, user.id!);
  if (error) return error;

  const project = await prisma.project.findUnique({
    where: { id },
    include: { documents: { orderBy: { path: "asc" } }, outputs: { orderBy: { createdAt: "desc" } } },
  });
  return NextResponse.json(project);
}

export async function DELETE(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const { error } = await assertProjectOwner(id, user.id!);
  if (error) return error;

  await prisma.project.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
