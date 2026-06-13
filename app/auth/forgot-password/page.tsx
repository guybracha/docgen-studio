"use client";
import { useState } from "react";
import Link from "next/link";
import { Mail, Loader2, ArrowRight, CheckCircle } from "lucide-react";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    const res = await fetch("/api/auth/forgot-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
    });
    const data = await res.json();
    setLoading(false);

    if (!res.ok) {
      setError(data.error ?? "שגיאה בשליחה");
    } else {
      setSent(true);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900 flex items-center justify-center p-4" dir="rtl">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">DocGen Studio</h1>
          <p className="text-blue-300">איפוס סיסמה</p>
        </div>

        <div className="bg-white/10 backdrop-blur border border-white/20 rounded-2xl p-8">
          {sent ? (
            <div className="text-center">
              <CheckCircle size={48} className="text-green-400 mx-auto mb-4" />
              <h2 className="text-white font-semibold text-lg mb-2">המייל נשלח!</h2>
              <p className="text-blue-200 text-sm mb-6">
                אם הכתובת רשומה במערכת, שלחנו לך קישור לאיפוס הסיסמה.<br />
                בדוק את תיבת הדואר שלך (כולל ספאם).
              </p>
              <Link
                href="/auth/login"
                className="flex items-center justify-center gap-2 text-blue-400 hover:text-blue-300 text-sm"
              >
                <ArrowRight size={14} /> חזור להתחברות
              </Link>
            </div>
          ) : (
            <>
              <p className="text-blue-200 text-sm mb-5 text-center">
                הזן את האימייל שלך ונשלח לך קישור לאיפוס הסיסמה
              </p>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="relative">
                  <Mail size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40" />
                  <input
                    type="email"
                    placeholder="האימייל שלך"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    autoFocus
                    className="w-full bg-white/10 border border-white/20 rounded-xl px-4 py-3 pr-10 text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                {error && <p className="text-red-400 text-sm text-center">{error}</p>}

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white py-3 rounded-xl font-medium transition"
                >
                  {loading ? <Loader2 size={18} className="animate-spin" /> : <Mail size={18} />}
                  שלח קישור לאיפוס
                </button>
              </form>

              <div className="text-center mt-5">
                <Link href="/auth/login" className="text-blue-400 hover:text-blue-300 text-sm flex items-center justify-center gap-1">
                  <ArrowRight size={14} /> חזור להתחברות
                </Link>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
