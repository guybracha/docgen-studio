"use client";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { useCallback, useEffect, useRef } from "react";

interface EditorProps {
  initialContent: string;
  onSave: (content: string) => void;
}

export default function Editor({ initialContent, onSave }: EditorProps) {
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const editor = useEditor({
    extensions: [StarterKit],
    content: initialContent || "<p></p>",
    editorProps: {
      attributes: {
        class:
          "prose prose-sm sm:prose max-w-none focus:outline-none min-h-full px-8 py-6 text-gray-800 leading-relaxed",
        dir: "auto",
      },
    },
    onUpdate: ({ editor }) => {
      if (saveTimer.current) clearTimeout(saveTimer.current);
      saveTimer.current = setTimeout(() => {
        onSave(editor.getHTML());
      }, 800);
    },
  });

  useEffect(() => {
    return () => {
      if (saveTimer.current) clearTimeout(saveTimer.current);
    };
  }, []);

  const execCommand = useCallback(
    (cmd: string) => {
      if (!editor) return;
      switch (cmd) {
        case "bold": editor.chain().focus().toggleBold().run(); break;
        case "italic": editor.chain().focus().toggleItalic().run(); break;
        case "strike": editor.chain().focus().toggleStrike().run(); break;
        case "h1": editor.chain().focus().toggleHeading({ level: 1 }).run(); break;
        case "h2": editor.chain().focus().toggleHeading({ level: 2 }).run(); break;
        case "h3": editor.chain().focus().toggleHeading({ level: 3 }).run(); break;
        case "bullet": editor.chain().focus().toggleBulletList().run(); break;
        case "ordered": editor.chain().focus().toggleOrderedList().run(); break;
        case "blockquote": editor.chain().focus().toggleBlockquote().run(); break;
        case "code": editor.chain().focus().toggleCodeBlock().run(); break;
        case "hr": editor.chain().focus().setHorizontalRule().run(); break;
        case "undo": editor.chain().focus().undo().run(); break;
        case "redo": editor.chain().focus().redo().run(); break;
      }
    },
    [editor]
  );

  if (!editor) return null;

  const btn = (cmd: string, label: string, title?: string) => (
    <button
      key={cmd}
      onMouseDown={(e) => { e.preventDefault(); execCommand(cmd); }}
      title={title ?? label}
      className="px-2 py-1 text-sm rounded hover:bg-gray-100 text-gray-700 font-medium"
    >
      {label}
    </button>
  );

  return (
    <div className="flex flex-col h-full bg-white">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-0.5 px-3 py-2 border-b border-gray-200 bg-gray-50 sticky top-0 z-10">
        {btn("undo", "↩", "ביטול")}
        {btn("redo", "↪", "חזור")}
        <div className="w-px h-5 bg-gray-200 mx-1" />
        {btn("h1", "H1", "כותרת 1")}
        {btn("h2", "H2", "כותרת 2")}
        {btn("h3", "H3", "כותרת 3")}
        <div className="w-px h-5 bg-gray-200 mx-1" />
        {btn("bold", "B", "מודגש")}
        {btn("italic", "I", "נטוי")}
        {btn("strike", "S̶", "קו חוצה")}
        <div className="w-px h-5 bg-gray-200 mx-1" />
        {btn("bullet", "•", "רשימה")}
        {btn("ordered", "1.", "רשימה ממוספרת")}
        {btn("blockquote", "❝", "ציטוט")}
        {btn("code", "</>", "קוד")}
        {btn("hr", "—", "קו מפריד")}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        <EditorContent editor={editor} className="h-full" />
      </div>
    </div>
  );
}
