import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import Anthropic from "@anthropic-ai/sdk";

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export async function POST(req: Request) {
  const { projectId, type, prompt: userPrompt, docIds } = await req.json();

  const docs = await prisma.document.findMany({
    where: { projectId, ...(docIds?.length ? { id: { in: docIds } } : {}) },
  });

  if (!docs.length) {
    return NextResponse.json({ error: "No documents found" }, { status: 400 });
  }

  const context = docs
    .map((d) => `=== ${d.path} ===\n${d.content}`)
    .join("\n\n");

  const typeInstructions: Record<string, string> = {
    report: "צור דוח מקצועי ומפורט בפורמט Markdown. כלול כותרות, תתי-כותרות, נקודות עיקריות וסיכום.",
    presentation: "צור תוכן למצגת בפורמט JSON עם שדות: title, slides (מערך של {title, bullets[], notes?}). החזר JSON בלבד.",
    spreadsheet: "צור נתונים לטבלת אקסל בפורמט JSON: {headers: string[], rows: string[][]}. החזר JSON בלבד.",
    infographic: "צור אינפוגרפיקה בפורמט HTML עם CSS מובנה. השתמש בצבעים, אייקונים ופריסה ויזואלית. החזר HTML בלבד.",
    summary: "צור סיכום תמציתי ומדויק של המסמכים.",
  };

  const systemPrompt = typeInstructions[type] ?? "ענה בעברית בצורה מקצועית.";

  const message = await client.messages.create({
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

  const content = message.content[0].type === "text" ? message.content[0].text : "";

  return NextResponse.json({ content, type });
}
