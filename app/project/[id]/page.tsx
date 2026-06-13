"use client";
import { useEffect, useState, useCallback, use, useRef } from "react";
import Link from "next/link";
import {
  ArrowRight, Plus, Folder, FileText, Trash2, Upload,
  Sparkles, Download, ChevronRight, ChevronDown, X, Save,
  ImageIcon, ExternalLink, LogOut, FileArchive, Image as ImageIcon2,
} from "lucide-react";
import { signOut } from "next-auth/react";
import dynamic from "next/dynamic";

const Editor = dynamic(() => import("@/components/Editor"), { ssr: false });

const IMAGE_TYPES = new Set([
  "image/jpeg", "image/jpg", "image/png", "image/gif",
  "image/webp", "image/svg+xml", "image/bmp", "image/tiff",
]);

const BINARY_TYPES = new Set([
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  "application/msword",
  "application/vnd.ms-excel",
  "application/vnd.ms-powerpoint",
  "application/pdf",
  "application/zip",
  "application/octet-stream",
]);

function isImage(mimeType: string) { return IMAGE_TYPES.has(mimeType); }
function isBinary(mimeType: string) { return BINARY_TYPES.has(mimeType); }

const MIME_LABELS: Record<string, string> = {
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": "Word (.docx)",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": "Excel (.xlsx)",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation": "PowerPoint (.pptx)",
  "application/msword": "Word (.doc)",
  "application/vnd.ms-excel": "Excel (.xls)",
  "application/vnd.ms-powerpoint": "PowerPoint (.ppt)",
  "application/pdf": "PDF",
  "application/zip": "ZIP",
};

interface Document {
  id: string;
  name: string;
  content: string;
  path: string;
  mimeType: string;
  fileUrl: string | null;
  updatedAt: string;
}

interface Project {
  id: string;
  name: string;
  description: string | null;
  documents: Document[];
}

interface TreeNode {
  name: string;
  fullPath: string;
  type: "folder" | "file";
  children?: TreeNode[];
  doc?: Document;
}

function buildTree(docs: Document[]): TreeNode[] {
  const root: TreeNode[] = [];
  const folderMap = new Map<string, TreeNode>();

  const getFolder = (parts: string[], upTo: number): TreeNode[] => {
    if (upTo === 0) return root;
    const p = parts.slice(0, upTo).join("/");
    if (folderMap.has(p)) return folderMap.get(p)!.children!;
    const parent = getFolder(parts, upTo - 1);
    const node: TreeNode = { name: parts[upTo - 1], fullPath: p, type: "folder", children: [] };
    folderMap.set(p, node);
    parent.push(node);
    return node.children!;
  };

  for (const doc of docs) {
    const parts = doc.path.split("/");
    const parent = getFolder(parts, parts.length - 1);
    parent.push({ name: parts[parts.length - 1], fullPath: doc.path, type: "file", doc });
  }

  return root;
}

const DOCX_MIME = "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
function isDocx(mimeType: string) { return mimeType === DOCX_MIME; }
function isEditableBinary(doc: Document) { return isDocx(doc.mimeType) && !!doc.content?.trim(); }

function FileIcon({ doc }: { doc: Document }) {
  if (isImage(doc.mimeType)) return <ImageIcon size={13} className="shrink-0 text-purple-500" />;
  if (isDocx(doc.mimeType)) return <FileText size={13} className="shrink-0 text-blue-600" />;
  if (isBinary(doc.mimeType)) return <FileArchive size={13} className="shrink-0 text-blue-400" />;
  return <FileText size={13} className="shrink-0" />;
}

function TreeItem({
  node, selected, onSelect, onDelete,
}: { node: TreeNode; selected: string | null; onSelect: (d: Document) => void; onDelete: (d: Document) => void }) {
  const [open, setOpen] = useState(true);
  if (node.type === "folder") {
    return (
      <div>
        <button
          onClick={() => setOpen(!open)}
          className="flex items-center gap-1.5 w-full text-right px-2 py-1.5 text-sm text-gray-600 hover:bg-gray-100 rounded-lg"
        >
          {open ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
          <Folder size={14} className="text-yellow-500" />
          <span className="truncate">{node.name}</span>
        </button>
        {open && (
          <div className="mr-4 border-r border-gray-200 pr-1">
            {node.children?.map((c) => (
              <TreeItem key={c.fullPath} node={c} selected={selected} onSelect={onSelect} onDelete={onDelete} />
            ))}
          </div>
        )}
      </div>
    );
  }
  return (
    <button
      onClick={() => node.doc && onSelect(node.doc)}
      className={`group flex items-center gap-1.5 w-full text-right px-2 py-1.5 text-sm rounded-lg ${
        selected === node.doc?.id ? "bg-blue-100 text-blue-700" : "text-gray-700 hover:bg-gray-100"
      }`}
    >
      {node.doc && <FileIcon doc={node.doc} />}
      <span className="flex-1 truncate">{node.name}</span>
      <span
        className="opacity-0 group-hover:opacity-100 text-red-400 hover:text-red-600 p-0.5 rounded"
        onClick={(e) => { e.stopPropagation(); node.doc && onDelete(node.doc); }}
      >
        <Trash2 size={12} />
      </span>
    </button>
  );
}

function ImageViewer({ doc }: { doc: Document }) {
  if (!doc.fileUrl) return null;
  return (
    <div className="flex-1 overflow-auto bg-gray-100 flex flex-col items-center justify-start p-8">
      <div className="bg-white rounded-2xl shadow-sm p-4 max-w-full">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={doc.fileUrl}
          alt={doc.name}
          className="max-w-full max-h-[70vh] object-contain rounded-xl"
        />
      </div>
      <div className="mt-4 flex items-center gap-3">
        <span className="text-sm text-gray-500">{doc.name}</span>
        <span className="text-xs text-gray-400 bg-gray-200 px-2 py-0.5 rounded-full">{doc.mimeType}</span>
        <a
          href={doc.fileUrl}
          download={doc.name}
          className="flex items-center gap-1 text-sm text-blue-600 hover:text-blue-500"
        >
          <Download size={14} /> הורד
        </a>
        <a
          href={doc.fileUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700"
        >
          <ExternalLink size={14} /> פתח בחלון חדש
        </a>
      </div>
    </div>
  );
}

function BinaryViewer({ doc }: { doc: Document }) {
  const label = MIME_LABELS[doc.mimeType] ?? doc.mimeType;
  return (
    <div className="flex-1 flex items-center justify-center bg-gray-50">
      <div className="text-center bg-white rounded-2xl shadow-sm p-10 max-w-sm w-full border border-gray-100">
        <FileArchive size={52} className="mx-auto mb-4 text-blue-400" />
        <p className="font-semibold text-gray-800 mb-1 text-lg truncate">{doc.name}</p>
        <p className="text-sm text-gray-400 mb-6">{label}</p>
        {doc.fileUrl ? (
          <a
            href={doc.fileUrl}
            download={doc.name}
            className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white px-5 py-2.5 rounded-xl text-sm font-medium transition"
          >
            <Download size={15} /> הורד קובץ
          </a>
        ) : (
          <p className="text-sm text-gray-400">הקובץ אינו זמין להורדה</p>
        )}
      </div>
    </div>
  );
}

type OutputType = "report" | "presentation" | "spreadsheet" | "infographic" | "summary";

export default function ProjectPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [project, setProject] = useState<Project | null>(null);
  const [selectedDoc, setSelectedDoc] = useState<Document | null>(null);
  const [saving, setSaving] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [generatedContent, setGeneratedContent] = useState<{ content: string; type: string } | null>(null);
  const [showGenPanel, setShowGenPanel] = useState(false);
  const [genType, setGenType] = useState<OutputType>("report");
  const [genPrompt, setGenPrompt] = useState("");
  const [newDocName, setNewDocName] = useState("");
  const [newDocPath, setNewDocPath] = useState("");
  const [showNewDoc, setShowNewDoc] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [selectedDocIds, setSelectedDocIds] = useState<Set<string>>(new Set());
  const [genProgress, setGenProgress] = useState(0);
  const infographicRef = useRef<HTMLDivElement>(null);

  const load = useCallback(() =>
    fetch(`/api/projects/${id}`).then((r) => r.json()).then(setProject),
    [id]
  );

  useEffect(() => { load(); }, [load]);

  const saveDoc = useCallback(async (content: string) => {
    if (!selectedDoc) return;
    setSaving(true);
    await fetch(`/api/documents/${selectedDoc.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content }),
    });
    setSaving(false);
    setProject((p) =>
      p ? { ...p, documents: p.documents.map((d) => d.id === selectedDoc.id ? { ...d, content } : d) } : p
    );
  }, [selectedDoc]);

  const createDoc = async (e: React.FormEvent) => {
    e.preventDefault();
    const path = newDocPath ? `${newDocPath}/${newDocName}` : newDocName;
    const res = await fetch(`/api/projects/${id}/documents`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: newDocName, path, content: "" }),
    });
    const doc = await res.json();
    setNewDocName(""); setNewDocPath(""); setShowNewDoc(false);
    await load();
    setSelectedDoc(doc);
  };

  const deleteDoc = async (doc: Document) => {
    if (!confirm(`למחוק את "${doc.name}"?`)) return;
    await fetch(`/api/documents/${doc.id}`, { method: "DELETE" });
    if (selectedDoc?.id === doc.id) setSelectedDoc(null);
    load();
  };

  const uploadFiles = async (files: File[]) => {
    const textFiles = files.filter((f) => !isImage(f.type || "") && !isBinary(f.type || ""));
    const binaryFiles = files.filter((f) => isImage(f.type || "") || isBinary(f.type || ""));

    for (const file of textFiles) {
      const content = await file.text();
      const relativePath = (file as File & { webkitRelativePath?: string }).webkitRelativePath || file.name;
      await fetch(`/api/projects/${id}/documents`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: file.name, path: relativePath, content, mimeType: file.type || "text/plain" }),
      });
    }

    if (binaryFiles.length > 0) {
      setUploading(true);
      const form = new FormData();
      for (const f of binaryFiles) form.append("file", f);
      await fetch(`/api/projects/${id}/upload`, { method: "POST", body: form });
      setUploading(false);
    }
  };

  const handleTextUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    await uploadFiles(Array.from(e.target.files ?? []));
    load();
    e.target.value = "";
  };

  const handleFolderUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    await uploadFiles(Array.from(e.target.files ?? []));
    load();
    e.target.value = "";
  };

  // Estimated max chars per type for progress calculation
  const EST_MAX: Record<string, number> = {
    report: 6000, presentation: 3000, spreadsheet: 2000, infographic: 5000, summary: 1500,
  };

  const generate = async () => {
    setGenerating(true);
    setGeneratedContent(null);
    setGenProgress(0);
    const docIds = selectedDocIds.size > 0 ? Array.from(selectedDocIds) : undefined;

    const res = await fetch("/api/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ projectId: id, type: genType, prompt: genPrompt, docIds }),
    });

    if (!res.ok) {
      const data = await res.json();
      setGeneratedContent({ content: `שגיאה: ${data.error}`, type: "error" });
      setGenerating(false);
      setGenProgress(0);
      return;
    }

    const type = res.headers.get("X-Gen-Type") ?? genType;
    const reader = res.body!.getReader();
    const decoder = new TextDecoder();
    let content = "";
    const estMax = EST_MAX[type] ?? 4000;

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      content += decoder.decode(value, { stream: true });
      setGenProgress(Math.min(95, Math.round((content.length / estMax) * 100)));
      setGeneratedContent({ content, type });
    }

    setGenProgress(100);
    setGenerating(false);
  };

  const exportDocx = async () => {
    if (!selectedDoc) return;
    const res = await fetch("/api/export", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ format: "docx", content: selectedDoc.content, title: selectedDoc.name }),
    });
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = selectedDoc.name.replace(/\.docx$/i, "") + ".docx";
    a.click();
    URL.revokeObjectURL(url);
  };

  const exportPng = async () => {
    if (!infographicRef.current) return;
    const { toPng } = await import("html-to-image");
    const dataUrl = await toPng(infographicRef.current, { cacheBust: true, pixelRatio: 2 });
    const a = document.createElement("a");
    a.href = dataUrl;
    a.download = `${project?.name ?? "infographic"}.png`;
    a.click();
  };

  const toggleDocSelection = (docId: string) => {
    setSelectedDocIds((prev) => {
      const next = new Set(prev);
      if (next.has(docId)) next.delete(docId);
      else next.add(docId);
      return next;
    });
  };

  const exportFile = async (format: string) => {
    if (!generatedContent) return;
    const res = await fetch("/api/export", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ format, content: generatedContent.content, title: project?.name }),
    });
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${project?.name ?? "output"}.${format}`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const tree = buildTree(project?.documents ?? []);

  const genTypeLabels: Record<OutputType, string> = {
    report: "דוח",
    presentation: "מצגת",
    spreadsheet: "גיליון נתונים",
    infographic: "אינפוגרפיקה",
    summary: "סיכום",
  };

  const imageCount = project?.documents.filter((d) => isImage(d.mimeType)).length ?? 0;
  const docCount = (project?.documents.length ?? 0) - imageCount;

  return (
    <div className="h-screen flex flex-col bg-gray-50" dir="rtl">
      {/* Top bar */}
      <header className="bg-white border-b border-gray-200 px-4 py-3 flex items-center gap-3">
        <Link href="/" className="text-gray-500 hover:text-gray-700">
          <ArrowRight size={20} />
        </Link>
        <div className="flex-1">
          <h1 className="font-semibold text-gray-900">{project?.name ?? "..."}</h1>
          {project?.description && <p className="text-xs text-gray-500">{project.description}</p>}
        </div>
        {saving && <span className="text-xs text-gray-400 flex items-center gap-1"><Save size={12} /> שומר...</span>}
        {uploading && <span className="text-xs text-gray-400 flex items-center gap-1"><Upload size={12} /> מעלה...</span>}
        <div className="flex items-center gap-2 text-xs text-gray-400">
          {docCount > 0 && <span className="flex items-center gap-1"><FileText size={12} />{docCount}</span>}
          {imageCount > 0 && <span className="flex items-center gap-1"><ImageIcon size={12} />{imageCount}</span>}
        </div>
        <button
          onClick={() => setShowGenPanel(true)}
          className="flex items-center gap-2 bg-gradient-to-r from-blue-600 to-violet-600 text-white px-4 py-2 rounded-xl text-sm font-medium hover:opacity-90 transition"
        >
          <Sparkles size={15} /> ייצר עם AI
        </button>
        <button
          onClick={() => signOut({ callbackUrl: "/auth/login" })}
          className="flex items-center gap-1.5 text-gray-400 hover:text-gray-600 text-sm px-3 py-2 rounded-xl hover:bg-gray-100 transition"
          title="יציאה"
        >
          <LogOut size={15} />
        </button>
      </header>

      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar */}
        <aside className="w-60 bg-white border-l border-gray-200 flex flex-col">
          <div className="p-3 border-b border-gray-100 flex items-center gap-1">
            <button
              onClick={() => setShowNewDoc(true)}
              className="flex-1 flex items-center gap-1.5 text-sm text-blue-600 hover:bg-blue-50 px-2 py-1.5 rounded-lg"
            >
              <Plus size={14} /> מסמך חדש
            </button>
            <label
              className="cursor-pointer text-gray-500 hover:text-gray-700 hover:bg-gray-100 p-1.5 rounded-lg"
              title="העלה קבצים (טקסט + תמונות)"
            >
              <Upload size={14} />
              <input
                type="file"
                multiple
                className="hidden"
                onChange={handleTextUpload}
                accept=".txt,.md,.csv,.json,.html,.docx,.xlsx,.pptx,.doc,.xls,.ppt,.pdf,image/*"
              />
            </label>
            <label
              className="cursor-pointer text-gray-500 hover:text-gray-700 hover:bg-gray-100 p-1.5 rounded-lg"
              title="העלה תיקייה"
            >
              <Folder size={14} />
              <input
                type="file"
                className="hidden"
                onChange={handleFolderUpload}
                // @ts-expect-error webkitdirectory is valid
                webkitdirectory="true"
                multiple
              />
            </label>
          </div>

          <div className="flex-1 overflow-y-auto p-2">
            {tree.length === 0 ? (
              <p className="text-xs text-gray-400 text-center mt-8 px-4">אין קבצים עדיין.<br />לחץ + כדי להוסיף.</p>
            ) : (
              tree.map((n) => (
                <TreeItem
                  key={n.fullPath}
                  node={n}
                  selected={selectedDoc?.id ?? null}
                  onSelect={setSelectedDoc}
                  onDelete={deleteDoc}
                />
              ))
            )}
          </div>
        </aside>

        {/* Main area */}
        <main className="flex-1 overflow-hidden flex flex-col">
          {selectedDoc ? (
            <>
              <div className="bg-white border-b border-gray-200 px-4 py-2 text-sm text-gray-500 flex items-center gap-1">
                {isImage(selectedDoc.mimeType) && <ImageIcon size={14} className="text-purple-500 ml-1" />}
                {isDocx(selectedDoc.mimeType) && <FileText size={14} className="text-blue-600 ml-1" />}
                <span className="flex-1 flex items-center gap-1">
                  {selectedDoc.path.split("/").map((p, i, arr) => (
                    <span key={i} className="flex items-center gap-1">
                      {i > 0 && <ChevronRight size={12} className="text-gray-300" />}
                      <span className={i === arr.length - 1 ? "text-gray-800 font-medium" : ""}>{p}</span>
                    </span>
                  ))}
                </span>
                {isEditableBinary(selectedDoc) && (
                  <button
                    onClick={exportDocx}
                    className="flex items-center gap-1.5 text-xs text-blue-600 hover:bg-blue-50 px-2.5 py-1 rounded-lg border border-blue-100 transition"
                  >
                    <Download size={12} /> ייצא DOCX
                  </button>
                )}
                {isDocx(selectedDoc.mimeType) && selectedDoc.fileUrl && (
                  <a
                    href={selectedDoc.fileUrl}
                    download={selectedDoc.name}
                    className="flex items-center gap-1.5 text-xs text-gray-500 hover:bg-gray-100 px-2.5 py-1 rounded-lg border border-gray-100 transition"
                  >
                    <Download size={12} /> מקור
                  </a>
                )}
              </div>
              <div className="flex-1 overflow-hidden flex flex-col">
                {isImage(selectedDoc.mimeType) && selectedDoc.fileUrl ? (
                  <ImageViewer doc={selectedDoc} />
                ) : isEditableBinary(selectedDoc) ? (
                  // DOCX with extracted content — editable in TipTap
                  <Editor
                    key={selectedDoc.id}
                    initialContent={selectedDoc.content}
                    onSave={saveDoc}
                  />
                ) : isBinary(selectedDoc.mimeType) ? (
                  <BinaryViewer doc={selectedDoc} />
                ) : (
                  <Editor
                    key={selectedDoc.id}
                    initialContent={selectedDoc.content}
                    onSave={saveDoc}
                  />
                )}
              </div>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center text-gray-400">
              <div className="text-center">
                <FileText size={48} className="mx-auto mb-3 opacity-30" />
                <p>בחר קובץ מהרשימה כדי לצפות או לערוך</p>
                <p className="text-xs mt-1 text-gray-300">תמיכה בטקסט, Markdown, ותמונות</p>
              </div>
            </div>
          )}
        </main>
      </div>

      {/* New Doc Modal */}
      {showNewDoc && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <form onSubmit={createDoc} className="bg-white rounded-2xl p-6 w-80 shadow-2xl">
            <h3 className="font-semibold mb-4">מסמך חדש</h3>
            <input
              autoFocus
              value={newDocName}
              onChange={(e) => setNewDocName(e.target.value)}
              placeholder="שם המסמך"
              required
              className="w-full border border-gray-200 rounded-xl px-3 py-2 mb-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <input
              value={newDocPath}
              onChange={(e) => setNewDocPath(e.target.value)}
              placeholder="תיקייה (אופציונלי, למשל: דוחות/2024)"
              className="w-full border border-gray-200 rounded-xl px-3 py-2 mb-4 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <div className="flex gap-2 justify-end">
              <button type="button" onClick={() => setShowNewDoc(false)} className="px-4 py-2 text-sm rounded-xl border border-gray-200 hover:bg-gray-50">ביטול</button>
              <button type="submit" className="px-4 py-2 text-sm bg-blue-600 text-white rounded-xl hover:bg-blue-500">צור</button>
            </div>
          </form>
        </div>
      )}

      {/* AI Generation Panel */}
      {showGenPanel && (
        <div className="fixed inset-0 bg-black/40 flex items-end md:items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-2xl shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-5 border-b border-gray-100">
              <h2 className="font-semibold text-lg flex items-center gap-2">
                <Sparkles size={18} className="text-violet-500" /> ייצור AI
              </h2>
              <button onClick={() => setShowGenPanel(false)} className="text-gray-400 hover:text-gray-600">
                <X size={20} />
              </button>
            </div>

            <div className="p-5 space-y-4">
              {/* Output type */}
              <div>
                <label className="text-sm font-medium text-gray-700 block mb-2">סוג הפלט</label>
                <div className="grid grid-cols-3 gap-2 md:grid-cols-5">
                  {(Object.keys(genTypeLabels) as OutputType[]).map((t) => (
                    <button
                      key={t}
                      onClick={() => setGenType(t)}
                      className={`py-2 px-3 rounded-xl text-sm border transition ${
                        genType === t ? "bg-blue-600 text-white border-blue-600" : "border-gray-200 hover:bg-gray-50"
                      }`}
                    >
                      {genTypeLabels[t]}
                    </button>
                  ))}
                </div>
              </div>

              {/* Document selection */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-sm font-medium text-gray-700">
                    מסמכי מקור
                    <span className="text-xs text-gray-400 font-normal mr-1">
                      ({selectedDocIds.size === 0 ? "כל המסמכים" : `${selectedDocIds.size} נבחרו`})
                    </span>
                  </label>
                  {selectedDocIds.size > 0 && (
                    <button
                      onClick={() => setSelectedDocIds(new Set())}
                      className="text-xs text-blue-500 hover:text-blue-700"
                    >
                      נקה בחירה
                    </button>
                  )}
                </div>
                <div className="border border-gray-200 rounded-xl overflow-hidden divide-y divide-gray-100 max-h-44 overflow-y-auto">
                  {project?.documents.length === 0 ? (
                    <p className="text-xs text-gray-400 p-3 text-center">אין מסמכים בפרויקט</p>
                  ) : (
                    project?.documents.map((doc) => {
                      const hasText = !!doc.content?.trim();
                      const img = isImage(doc.mimeType);
                      const bin = isBinary(doc.mimeType) && !hasText;
                      const usable = hasText && !img && !bin;
                      const checked = selectedDocIds.has(doc.id);
                      return (
                        <label
                          key={doc.id}
                          className={`flex items-center gap-3 px-3 py-2 cursor-pointer text-sm transition ${
                            usable ? "hover:bg-gray-50" : "opacity-50 cursor-not-allowed bg-gray-50"
                          }`}
                        >
                          <input
                            type="checkbox"
                            disabled={!usable}
                            checked={checked}
                            onChange={() => usable && toggleDocSelection(doc.id)}
                            className="rounded"
                          />
                          <span className="flex-1 truncate text-gray-700">{doc.name}</span>
                          {!usable && (
                            <span className="text-xs text-gray-400 shrink-0">
                              {bin || img ? "קובץ בינארי" : "ריק"}
                            </span>
                          )}
                          {usable && (
                            <span className="text-xs text-emerald-500 shrink-0">
                              {doc.content.length.toLocaleString()} תווים
                            </span>
                          )}
                        </label>
                      );
                    })
                  )}
                </div>
                {project?.documents.every((d) => !d.content?.trim() || isBinary(d.mimeType) || isImage(d.mimeType)) && (
                  <p className="text-xs text-amber-600 mt-2 flex items-center gap-1">
                    ⚠️ אין מסמכי טקסט בפרויקט. הוסף מסמכי טקסט (txt, md, csv וכו׳) כדי שה-AI יוכל לעבוד עליהם.
                  </p>
                )}
              </div>

              {/* Extra instructions */}
              <div>
                <label className="text-sm font-medium text-gray-700 block mb-2">הוראות נוספות (אופציונלי)</label>
                <textarea
                  value={genPrompt}
                  onChange={(e) => setGenPrompt(e.target.value)}
                  rows={2}
                  placeholder={`לדוגמה: "צור ${genTypeLabels[genType]} מפורט שמתמקד בנתוני המכירות..."`}
                  className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                />
              </div>

              <div className="space-y-2">
                <button
                  onClick={generate}
                  disabled={generating}
                  className="w-full py-3 bg-gradient-to-r from-blue-600 to-violet-600 text-white rounded-xl font-medium hover:opacity-90 transition disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {generating ? (
                    <><span className="animate-spin inline-block">⏳</span> מייצר... {genProgress}%</>
                  ) : (
                    <><Sparkles size={16} /> ייצר {genTypeLabels[genType]}</>
                  )}
                </button>
                {generating && (
                  <div className="w-full bg-gray-100 rounded-full h-2 overflow-hidden">
                    <div
                      className="h-2 bg-gradient-to-r from-blue-500 to-violet-500 rounded-full transition-all duration-300"
                      style={{ width: `${genProgress}%` }}
                    />
                  </div>
                )}
              </div>

              {generatedContent && generatedContent.type === "error" ? (
                <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-sm text-amber-800">
                  {generatedContent.content}
                </div>
              ) : generatedContent && (
                <div className="border border-gray-200 rounded-xl overflow-hidden">
                  <div className="bg-gray-50 px-4 py-2 flex items-center justify-between border-b border-gray-200">
                    <span className="text-sm font-medium text-gray-600">תוצאה</span>
                    <div className="flex gap-2">
                      {(genType === "report" || genType === "summary") && (
                        <button onClick={() => exportFile("docx")} className="flex items-center gap-1 text-xs text-blue-600 hover:bg-blue-50 px-2 py-1 rounded-lg">
                          <Download size={12} /> Word
                        </button>
                      )}
                      {genType === "spreadsheet" && (
                        <button onClick={() => exportFile("xlsx")} className="flex items-center gap-1 text-xs text-green-600 hover:bg-green-50 px-2 py-1 rounded-lg">
                          <Download size={12} /> Excel
                        </button>
                      )}
                      {genType === "infographic" && !generating && (
                        <button onClick={exportPng} className="flex items-center gap-1 text-xs text-violet-600 hover:bg-violet-50 px-2 py-1 rounded-lg font-medium">
                          <Download size={12} /> PNG
                        </button>
                      )}
                    </div>
                  </div>
                  {genType === "infographic" ? (
                    <div className="overflow-auto bg-white">
                      <div
                        ref={infographicRef}
                        className="min-w-[900px]"
                        dangerouslySetInnerHTML={{ __html: generatedContent.content }}
                      />
                    </div>
                  ) : (
                    <pre className="p-4 text-xs whitespace-pre-wrap text-gray-700 max-h-60 overflow-y-auto font-mono">
                      {generatedContent.content}
                    </pre>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
