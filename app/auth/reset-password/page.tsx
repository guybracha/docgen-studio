"use client";
import { useState, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import { Lock, Loader2, CheckCircle, ArrowRight } from "lucide-react";

function ResetForm() {
  const params = useSearchParams();
  const router = useRouter();
  const token = params.get("token") ?? "";
  const email = params.get("email") ?? "";

  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirm) {
      setError("הסיסמאות אינן תואמות");
      return;
    }
    setLoading(true);
    setError("");

    const res = await fetch("/api/auth/reset-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, token, password }),
    });
    const data = await res.json();
    setLoading(false);

    if (!res.ok) {
      setError(data.error ?? "שגיאה באיפוס");
    } else {
      setDone(true);
      setTimeout(() => router.push("/auth/login"), 2500);
    }
  };

  if (!token || !email) {
    return (
      <div className="text-center text-red-400">
        <p>קישור לא תקין. <Link href="/auth/forgot-password" className="underline">בקש קישור חדש</Link></p>
      </div>
    );
  }

  return done ? (
    <div className="text-center">
      <CheckCircle size={48} className="text-green-400 mx-auto mb-4" />
      <h2 className="text-white font-semibold text-lg mb-2">הסיסמה אופסה בהצלחה!</h2>
      <p className="text-blue-200 text-sm">מועבר לדף ההתחברות...</p>
    </div>
  ) : (
    <form onSubmit={handleSubmit} className="space-y-4">
      <p className="text-blue-200 text-sm text-center mb-2">
        מאפס סיסמה עבור: <span className="text-white font-medium">{email}</span>
      </p>
      <div className="relative">
        <Lock size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40" />
        <input
          type="password"
          placeholder="סיסמה חדשה (לפחות 8 תווים)"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          autoFocus
          className="w-full bg-white/10 border border-white/20 rounded-xl px-4 py-3 pr-10 text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>
      <div className="relative">
        <Lock size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40" />
        <input
          type="password"
          placeholder="אימות סיסמה"
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          required
          className="w-full bg-white/10 border border-white/20 rounded-xl px-4 py-3 pr-10 text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      {error && <p className="text-red-400 text-sm text-center">{error}</p>}

      <button
        type="submit"
        disabled={loading}
        className="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white py-3 rounded-xl font-medium transition"
      >
        {loading ? <Loader2 size={18} className="animate-spin" /> : <Lock size={18} />}
        שמור סיסמה חדשה
      </button>

      <div className="text-center">
        <Link href="/auth/login" className="text-blue-400 hover:text-blue-300 text-sm flex items-center justify-center gap-1">
          <ArrowRight size={14} /> חזור להתחברות
        </Link>
      </div>
    </form>
  );
}

export default function ResetPasswordPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900 flex items-center justify-center p-4" dir="rtl">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">DocGen Studio</h1>
          <p className="text-blue-300">הגדרת סיסמה חדשה</p>
        </div>
        <div className="bg-white/10 backdrop-blur border border-white/20 rounded-2xl p-8">
          <Suspense fallback={<div className="text-white text-center">טוען...</div>}>
            <ResetForm />
          </Suspense>
        </div>
      </div>
    </div>
  );
}
