import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id: projectId } = await params;
  const { name, content, path, mimeType } = await req.json();
  const doc = await prisma.document.create({
    data: { name, content: content ?? "", path: path ?? name, mimeType: mimeType ?? "text/plain", projectId },
  });
  return NextResponse.json(doc);
}

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id: projectId } = await params;
  const docs = await prisma.document.findMany({
    where: { projectId },
    orderBy: { path: "asc" },
  });
  return NextResponse.json(docs);
}
