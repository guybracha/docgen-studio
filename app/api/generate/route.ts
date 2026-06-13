import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUser, assertProjectOwner } from "@/lib/auth-helpers";
import Anthropic from "@anthropic-ai/sdk";

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export async function POST(req: Request) {
  try {
    const user = await getSessionUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { projectId, type, prompt: userPrompt, docIds } = await req.json();

    const { error } = await assertProjectOwner(projectId, user.id!);
    if (error) return error;

    const docs = await prisma.document.findMany({
      where: { projectId, ...(docIds?.length ? { id: { in: docIds } } : {}) },
    });

    if (!docs.length) {
      return NextResponse.json({ error: "אין מסמכים בפרויקט" }, { status: 400 });
    }

    const context = docs
      .filter((d) => d.content?.trim() && !d.fileUrl?.startsWith("data:"))
      .map((d) => `=== ${d.path} ===\n${d.content}`)
      .join("\n\n");

    if (!context.trim()) {
      return NextResponse.json({ error: "אין תוכן טקסט להשתמש בו. אנא הוסף מסמכי טקסט לפרויקט." }, { status: 400 });
    }

    const typeInstructions: Record<string, string> = {
      report: "צור דוח מקצועי ומפורט בפורמט Markdown. כלול כותרות, תתי-כותרות, נקודות עיקריות וסיכום.",
      presentation: "צור תוכן למצגת בפורמט JSON עם שדות: title, slides (מערך של {title, bullets[], notes?}). החזר JSON בלבד.",
      spreadsheet: "צור נתונים לטבלת אקסל בפורמט JSON: {headers: string[], rows: string[][]}. החזר JSON בלבד.",
      infographic: `צור אינפוגרפיקה ויזואלית מרשימה בפורמט HTML עם CSS מובנה (inline styles בלבד, ללא external resources).
חוקים:
- רוחב קבוע: 900px, גובה אוטומטי (מינימום 600px)
- השתמש בצבעים עזים ועיצוב מקצועי
- כלול כותרות גדולות, מספרים/סטטיסטיקות בולטים, אייקונים מ-Unicode
- פריסה ב-CSS Grid או Flexbox
- גופנים: font-family: 'Segoe UI', Arial, sans-serif
- כיוון RTL: direction: rtl
- אין תמונות חיצוניות, אין Google Fonts, אין CDN
- החזר HTML בלבד, החל מ-<div`,
      summary: "צור סיכום תמציתי ומדויק של המסמכים.",
    };

    const systemPrompt = typeInstructions[type] ?? "ענה בעברית בצורה מקצועית.";

    // Stream the response
    const stream = client.messages.stream({
      model: "claude-sonnet-4-6",
      max_tokens: 4096,
      system: `אתה עוזר AI מקצועי ליצירת מסמכים עסקיים. ${systemPrompt}`,
      messages: [
        {
          role: "user",
          content: `להלן תוכן המסמכים מהפרויקט:\n\n${context}\n\n${userPrompt || `צור ${type} מהמסמכים הנ"ל.`}`,
        },
      ],
    });

    const encoder = new TextEncoder();
    const readable = new ReadableStream({
      async start(controller) {
        try {
          for await (const chunk of stream) {
            if (
              chunk.type === "content_block_delta" &&
              chunk.delta.type === "text_delta"
            ) {
              controller.enqueue(encoder.encode(chunk.delta.text));
            }
          }
        } finally {
          controller.close();
        }
      },
    });

    return new Response(readable, {
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "X-Gen-Type": type,
        "Cache-Control": "no-cache",
      },
    });
  } catch (err) {
    console.error("Generate error:", err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
