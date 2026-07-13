"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth, ROLE_HOME } from "@/src/AuthContext";
import { ApiError } from "@/src/api";

export default function LoginPage() {
  const { user, loading, login, requestOtp, loginWithOtp } = useAuth();
  const router = useRouter();
  const [mode, setMode] = useState<"password" | "otp">("password");

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const [otpStep, setOtpStep] = useState<"email" | "code">("email");
  const [otpEmail, setOtpEmail] = useState("");
  const [otpCode, setOtpCode] = useState("");
  const [otpInfo, setOtpInfo] = useState<string | null>(null);

  useEffect(() => {
    if (!loading && user) {
      router.replace(ROLE_HOME[user.role]);
    }
  }, [loading, user, router]);

  function switchMode(next: "password" | "otp") {
    setMode(next);
    setError(null);
    setOtpInfo(null);
    setOtpStep("email");
    setOtpCode("");
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    const found = await login(username.trim(), password);
    setSubmitting(false);
    if (!found) {
      setError("Invalid username or password.");
      return;
    }
    setError(null);
    router.replace(ROLE_HOME[found.role]);
  }

  async function handleSendCode(e: FormEvent) {
    e.preventDefault();
    if (!otpEmail.trim()) return;
    setSubmitting(true);
    setError(null);
    setOtpInfo(null);
    try {
      await requestOtp(otpEmail.trim());
      setOtpStep("code");
      setOtpInfo("A 6-digit code has been sent to your email.");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to send code");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleVerifyCode(e: FormEvent) {
    e.preventDefault();
    if (!otpCode.trim()) return;
    setSubmitting(true);
    setError(null);
    try {
      const found = await loginWithOtp(otpEmail.trim(), otpCode.trim());
      if (found) router.replace(ROLE_HOME[found.role]);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to verify code");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div
      className="flex flex-1 items-center justify-center px-6 py-10"
      style={{
        background:
          "radial-gradient(ellipse 80% 60% at 20% 0%, rgba(37,99,176,.35) 0%, transparent 60%)," +
          "radial-gradient(ellipse 60% 50% at 80% 100%, rgba(224,123,32,.25) 0%, transparent 55%)," +
          "linear-gradient(160deg, #050d1f 0%, #0a1540 50%, #0d1b5e 100%)",
      }}
    >
      <div className="w-full max-w-[420px]">
        <div className="rounded-[28px] bg-[rgba(255,255,255,0.97)] px-10 py-11 shadow-[0_24px_80px_rgba(13,27,94,0.5)]">
          <div className="mb-6 flex items-center gap-4 border-b-2 border-[#e8edf5] pb-5">
            <div className="flex h-[72px] w-[72px] shrink-0 items-center justify-center overflow-hidden rounded-full border-2 border-[#e07b20] shadow-[0_0_0_2px_#d4a017,0_4px_10px_rgba(13,27,94,0.25)]">
              <img
                src="/KDU-LOGO-ORIGINAL-5x4-inch-copy.png"
                alt="KDU logo"
                className="h-full w-full object-contain"
              />
            </div>
            <div>
              <div className="text-[10px] font-bold uppercase tracking-[.2em] text-[#e07b20]">
                KDU Southern Campus
              </div>
              <div className="text-2xl font-black leading-none tracking-tight text-[#0d1b5e]">
                OLMS
              </div>
              <div className="mt-1 text-xs text-[#94a3b8]">
                Online Leave Management System
              </div>
            </div>
          </div>

          <div className="mb-5 text-center">
            <h3 className="text-lg font-bold text-[#0d1b5e]">Sign in to your account</h3>
          </div>

          <div className="mb-5 flex gap-2 rounded-xl bg-[#f1f5f9] p-1">
            <button
              type="button"
              onClick={() => switchMode("password")}
              className={`flex-1 rounded-lg py-2 text-xs font-bold transition-colors ${
                mode === "password" ? "bg-white text-[#0d1b5e] shadow-sm" : "text-[#64748b]"
              }`}
            >
              🔑 Password
            </button>
            <button
              type="button"
              onClick={() => switchMode("otp")}
              className={`flex-1 rounded-lg py-2 text-xs font-bold transition-colors ${
                mode === "otp" ? "bg-white text-[#0d1b5e] shadow-sm" : "text-[#64748b]"
              }`}
            >
              ✉️ Email Code
            </button>
          </div>

          {error && (
            <div className="mb-3.5 rounded-lg border border-[rgba(220,38,38,0.2)] bg-[rgba(220,38,38,0.08)] px-3.5 py-2.5 text-xs text-[#991b1b]">
              {error}
            </div>
          )}
          {otpInfo && (
            <div className="mb-3.5 rounded-lg border border-[rgba(34,197,94,0.25)] bg-[rgba(34,197,94,0.08)] px-3.5 py-2.5 text-xs text-[#166534]">
              {otpInfo}
            </div>
          )}

          {mode === "password" ? (
            <form onSubmit={handleSubmit} className="space-y-3.5">
              <label className="block">
                <span className="mb-1.5 block text-[11px] font-bold uppercase tracking-wide text-[#475569]">
                  Username
                </span>
                <input
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  autoComplete="username"
                  className="w-full rounded-lg border-[1.5px] border-[#e2e8f0] bg-[#f8fafc] px-3.5 py-3 text-sm text-[#1e293b] outline-none transition-all focus:border-[#2563b0] focus:bg-white focus:shadow-[0_0_0_4px_rgba(37,99,176,0.1)]"
                  placeholder="Enter your username"
                />
              </label>
              <div>
                <span className="mb-1.5 block text-[11px] font-bold uppercase tracking-wide text-[#475569]">
                  Password
                </span>
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="current-password"
                  className="w-full rounded-lg border-[1.5px] border-[#e2e8f0] bg-[#f8fafc] px-3.5 py-3 text-sm text-[#1e293b] outline-none transition-all focus:border-[#2563b0] focus:bg-white focus:shadow-[0_0_0_4px_rgba(37,99,176,0.1)]"
                  placeholder="Enter your password"
                />
                <label className="mt-2 flex items-center gap-2 text-xs text-[#475569]">
                  <input
                    type="checkbox"
                    checked={showPassword}
                    onChange={(e) => setShowPassword(e.target.checked)}
                    className="h-3.5 w-3.5"
                  />
                  Show password
                </label>
              </div>
              <button
                type="submit"
                disabled={submitting}
                className="mt-2 w-full rounded-2xl bg-gradient-to-br from-[#0d1b5e] to-[#2563b0] py-3.5 text-[15px] font-bold text-white shadow-[0_6px_24px_rgba(13,27,94,0.4)] transition-all hover:-translate-y-0.5 hover:shadow-[0_10px_32px_rgba(13,27,94,0.5)] disabled:cursor-not-allowed disabled:opacity-60"
              >
                {submitting ? "Signing in…" : "Login 🔐"}
              </button>
            </form>
          ) : otpStep === "email" ? (
            <form onSubmit={handleSendCode} className="space-y-3.5">
              <label className="block">
                <span className="mb-1.5 block text-[11px] font-bold uppercase tracking-wide text-[#475569]">
                  Email Address
                </span>
                <input
                  type="email"
                  value={otpEmail}
                  onChange={(e) => setOtpEmail(e.target.value)}
                  autoComplete="email"
                  className="w-full rounded-lg border-[1.5px] border-[#e2e8f0] bg-[#f8fafc] px-3.5 py-3 text-sm text-[#1e293b] outline-none transition-all focus:border-[#2563b0] focus:bg-white focus:shadow-[0_0_0_4px_rgba(37,99,176,0.1)]"
                  placeholder="Enter the email your admin set for you"
                />
              </label>
              <p className="text-[11px] leading-relaxed text-[#94a3b8]">
                Your admin must have added this email to your account first. A one-time code will be sent
                there — no password needed.
              </p>
              <button
                type="submit"
                disabled={submitting}
                className="mt-2 w-full rounded-2xl bg-gradient-to-br from-[#0d1b5e] to-[#2563b0] py-3.5 text-[15px] font-bold text-white shadow-[0_6px_24px_rgba(13,27,94,0.4)] transition-all hover:-translate-y-0.5 hover:shadow-[0_10px_32px_rgba(13,27,94,0.5)] disabled:cursor-not-allowed disabled:opacity-60"
              >
                {submitting ? "Sending…" : "Send Code ✉️"}
              </button>
            </form>
          ) : (
            <form onSubmit={handleVerifyCode} className="space-y-3.5">
              <label className="block">
                <span className="mb-1.5 block text-[11px] font-bold uppercase tracking-wide text-[#475569]">
                  6-Digit Code
                </span>
                <input
                  value={otpCode}
                  onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  autoFocus
                  className="w-full rounded-lg border-[1.5px] border-[#e2e8f0] bg-[#f8fafc] px-3.5 py-3 text-center text-lg tracking-[0.4em] text-[#1e293b] outline-none transition-all focus:border-[#2563b0] focus:bg-white focus:shadow-[0_0_0_4px_rgba(37,99,176,0.1)]"
                  placeholder="000000"
                />
              </label>
              <p className="text-[11px] text-[#94a3b8]">
                Sent to <strong>{otpEmail}</strong>. Code expires in 10 minutes.
              </p>
              <button
                type="submit"
                disabled={submitting || otpCode.length !== 6}
                className="mt-2 w-full rounded-2xl bg-gradient-to-br from-[#0d1b5e] to-[#2563b0] py-3.5 text-[15px] font-bold text-white shadow-[0_6px_24px_rgba(13,27,94,0.4)] transition-all hover:-translate-y-0.5 hover:shadow-[0_10px_32px_rgba(13,27,94,0.5)] disabled:cursor-not-allowed disabled:opacity-60"
              >
                {submitting ? "Verifying…" : "Verify & Login 🔐"}
              </button>
              <button
                type="button"
                onClick={() => {
                  setOtpStep("email");
                  setOtpCode("");
                  setOtpInfo(null);
                  setError(null);
                }}
                className="w-full text-center text-xs font-semibold text-[#2563b0]"
              >
                ← Use a different email / resend code
              </button>
            </form>
          )}
        </div>
        <div className="mt-4 text-center text-[10px] tracking-wide text-[rgba(255,255,255,0.4)]">
          © KDU Southern Campus
        </div>
      </div>
    </div>
  );
}
