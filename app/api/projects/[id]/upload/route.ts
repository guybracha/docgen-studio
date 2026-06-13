import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { writeFile, mkdir } from "fs/promises";
import path from "path";

const IMAGE_TYPES = new Set([
  "image/jpeg", "image/jpg", "image/png", "image/gif",
  "image/webp", "image/svg+xml", "image/bmp", "image/tiff",
]);

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id: projectId } = await params;
    const formData = await req.formData();
    const created = [];

    for (const [, value] of formData.entries()) {
      if (typeof value === "string") continue;
      const file = value as File;

      const relativePath = (file as File & { webkitRelativePath?: string }).webkitRelativePath || file.name;
      const mimeType = file.type || "application/octet-stream";

      if (!IMAGE_TYPES.has(mimeType)) continue;

      const bytes = await file.arrayBuffer();
      const buffer = Buffer.from(bytes);

      // Save to public/uploads/[projectId]/
      const uploadDir = path.join(process.cwd(), "public", "uploads", projectId);
      await mkdir(uploadDir, { recursive: true });

      // Sanitize filename
      const safeName = file.name.replace(/[^a-zA-Z0-9._\-֐-׿]/g, "_");
      const fileName = `${Date.now()}_${safeName}`;
      const filePath = path.join(uploadDir, fileName);
      await writeFile(filePath, buffer);

      const fileUrl = `/uploads/${projectId}/${fileName}`;

      const doc = await prisma.document.create({
        data: {
          name: file.name,
          path: relativePath,
          content: "",
          mimeType,
          fileUrl,
          projectId,
        },
      });
      created.push(doc);
    }

    return NextResponse.json(created);
  } catch (err) {
    console.error("Upload error:", err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
