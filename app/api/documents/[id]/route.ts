import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { unlink } from "fs/promises";
import path from "path";

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const doc = await prisma.document.findUnique({ where: { id } });
  if (!doc) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(doc);
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await req.json();
  const doc = await prisma.document.update({
    where: { id },
    data: {
      ...(body.content !== undefined && { content: body.content }),
      ...(body.name !== undefined && { name: body.name }),
    },
  });
  return NextResponse.json(doc);
}

export async function DELETE(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const doc = await prisma.document.findUnique({ where: { id } });

  if (doc?.fileUrl) {
    const filePath = path.join(process.cwd(), "public", doc.fileUrl);
    await unlink(filePath).catch(() => {});
  }

  await prisma.document.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
