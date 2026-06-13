"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useSession, signOut } from "next-auth/react";
import { FolderOpen, Plus, Trash2, FileText, LogOut, User } from "lucide-react";

interface Project {
  id: string;
  name: string;
  description: string | null;
  createdAt: string;
  _count?: { documents: number };
}

export default function Home() {
  const { data: session } = useSession();
  const [projects, setProjects] = useState<Project[]>([]);
  const [creating, setCreating] = useState(false);
  const [name, setName] = useState("");
  const [desc, setDesc] = useState("");

  const load = () =>
    fetch("/api/projects")
      .then((r) => r.json())
      .then((data) => setProjects(Array.isArray(data) ? data : []))
      .catch(() => setProjects([]));

  useEffect(() => { load(); }, []);

  const create = async (e: React.FormEvent) => {
    e.preventDefault();
    await fetch("/api/projects", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, description: desc }),
    });
    setName(""); setDesc(""); setCreating(false);
    load();
  };

  const del = async (id: string) => {
    if (!confirm("למחוק את הפרויקט?")) return;
    await fetch(`/api/projects/${id}`, { method: "DELETE" });
    load();
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900">
      <div className="max-w-5xl mx-auto px-6 py-12">
        {/* Header */}
        <div className="mb-10 flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-bold text-white mb-1">DocGen Studio</h1>
            <p className="text-blue-300">יצירת מסמכים, דוחות ומצגות בכוח AI</p>
          </div>
          {session?.user && (
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2 bg-white/10 rounded-xl px-3 py-2">
                {session.user.image ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={session.user.image} alt="" className="w-7 h-7 rounded-full" />
                ) : (
                  <div className="w-7 h-7 rounded-full bg-blue-500 flex items-center justify-center">
                    <User size={14} className="text-white" />
                  </div>
                )}
                <span className="text-white text-sm font-medium">
                  {session.user.name ?? session.user.email}
                </span>
              </div>
              <button
                onClick={() => signOut({ callbackUrl: "/auth/login" })}
                className="flex items-center gap-1.5 text-blue-300 hover:text-white transition text-sm px-3 py-2 rounded-xl hover:bg-white/10"
              >
                <LogOut size={15} /> יציאה
              </button>
            </div>
          )}
        </div>

        {/* New Project Button */}
        <div className="mb-8 flex justify-end">
          <button
            onClick={() => setCreating(true)}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white px-5 py-2.5 rounded-xl font-medium transition-colors shadow-lg"
          >
            <Plus size={18} /> פרויקט חדש
          </button>
        </div>

        {/* Create Modal */}
        {creating && (
          <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
            <form onSubmit={create} className="bg-white rounded-2xl p-8 w-full max-w-md shadow-2xl">
              <h2 className="text-xl font-bold mb-5">פרויקט חדש</h2>
              <input
                autoFocus
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="שם הפרויקט"
                required
                className="w-full border border-gray-200 rounded-xl px-4 py-3 mb-3 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <textarea
                value={desc}
                onChange={(e) => setDesc(e.target.value)}
                placeholder="תיאור (אופציונלי)"
                rows={3}
                className="w-full border border-gray-200 rounded-xl px-4 py-3 mb-5 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
              />
              <div className="flex gap-3 justify-end">
                <button type="button" onClick={() => setCreating(false)} className="px-5 py-2 rounded-xl border border-gray-200 hover:bg-gray-50">ביטול</button>
                <button type="submit" className="px-5 py-2 bg-blue-600 text-white rounded-xl hover:bg-blue-500">צור</button>
              </div>
            </form>
          </div>
        )}

        {/* Projects Grid */}
        {projects.length === 0 ? (
          <div className="text-center py-20 text-blue-300">
            <FolderOpen size={48} className="mx-auto mb-4 opacity-50" />
            <p className="text-lg">אין פרויקטים עדיין. צור פרויקט חדש כדי להתחיל.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {projects.map((p) => (
              <div key={p.id} className="bg-white/10 backdrop-blur border border-white/20 rounded-2xl p-6 hover:bg-white/15 transition group relative">
                <Link href={`/project/${p.id}`} className="block">
                  <div className="flex items-start gap-3 mb-3">
                    <div className="bg-blue-500/20 rounded-xl p-2.5">
                      <FolderOpen size={22} className="text-blue-400" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-white truncate text-lg">{p.name}</h3>
                      {p.description && <p className="text-blue-300 text-sm mt-0.5 line-clamp-2">{p.description}</p>}
                    </div>
                  </div>
                  <div className="flex items-center gap-1 text-blue-400 text-sm mt-4">
                    <FileText size={14} />
                    <span>{p._count?.documents ?? 0} מסמכים</span>
                  </div>
                  <div className="text-blue-400/60 text-xs mt-1">
                    {new Date(p.createdAt).toLocaleDateString("he-IL")}
                  </div>
                </Link>
                <button
                  onClick={() => del(p.id)}
                  className="absolute top-4 left-4 opacity-0 group-hover:opacity-100 text-red-400 hover:text-red-300 transition-opacity"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
