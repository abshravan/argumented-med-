"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { KeyRound, Zap } from "lucide-react";
import AuthLayout from "@/components/auth/AuthLayout";
import { Divider, ErrorNote, Field, PrimaryButton, SsoButton, inputStyle } from "@/components/auth/fields";
import { AuthError, TEST_ACCOUNT, getSession, signIn, signInAsTestUser } from "@/lib/auth";
import { BlurFade } from "@/components/magicui/blur-fade";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState(TEST_ACCOUNT.email);
  const [password, setPassword] = useState(TEST_ACCOUNT.password);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  // Already signed in → straight through.
  useEffect(() => {
    const session = getSession();
    if (session) router.replace(session.onboarded ? "/" : "/onboarding");
  }, [router]);

  const go = (fn: () => { onboarded: boolean }) => {
    setError("");
    setBusy(true);
    try {
      const session = fn();
      router.replace(session.onboarded ? "/" : "/onboarding");
    } catch (e) {
      setError(e instanceof AuthError ? e.message : "Something went wrong. Try again.");
      setBusy(false);
    }
  };

  return (
    <AuthLayout>
      <BlurFade>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            go(() => signIn(email, password));
          }}
        >
          <div style={{ fontSize: 24, fontWeight: 800, color: "var(--text-bright)", letterSpacing: "-0.4px" }}>
            Welcome back
          </div>
          <div style={{ fontSize: 13.5, color: "var(--text-dim)", marginTop: 6 }}>
            Sign in to continue to your workspace.
          </div>

          {/* Test account callout */}
          <div
            style={{
              marginTop: 20,
              padding: "12px 14px",
              borderRadius: 10,
              background: "rgba(45,212,191,0.07)",
              border: "1px solid rgba(45,212,191,0.25)",
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 7,
                fontSize: 11.5,
                fontWeight: 700,
                color: "var(--teal-bright)",
                textTransform: "uppercase",
                letterSpacing: "0.5px",
              }}
            >
              <KeyRound size={13} /> Test account
            </div>
            <div style={{ fontSize: 12.5, color: "var(--text-soft)", marginTop: 7, lineHeight: 1.6 }}>
              <code style={{ color: "var(--text-bright)" }}>{TEST_ACCOUNT.email}</code>
              <br />
              <code style={{ color: "var(--text-bright)" }}>{TEST_ACCOUNT.password}</code>
            </div>
            <button
              type="button"
              onClick={() => go(signInAsTestUser)}
              style={{
                marginTop: 10,
                width: "100%",
                height: 34,
                borderRadius: 8,
                border: "1px solid rgba(45,212,191,0.3)",
                background: "rgba(45,212,191,0.12)",
                color: "var(--teal-bright)",
                fontSize: 12.5,
                fontWeight: 700,
                cursor: "pointer",
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 7,
              }}
            >
              <Zap size={13} /> Sign in as test user
            </button>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 15, marginTop: 20 }}>
            <Field label="Work email">
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="jane.smith@hospital.org"
                style={inputStyle}
                autoComplete="username"
              />
            </Field>
            <Field label="Password">
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter your password"
                style={inputStyle}
                autoComplete="current-password"
              />
            </Field>

            <ErrorNote message={error} />

            <PrimaryButton type="submit" disabled={busy}>
              {busy ? "Signing in…" : "Sign in"}
            </PrimaryButton>

            <Divider />

            <SsoButton onClick={() => setError("Hospital SSO isn't wired up in this demo — use the test account.")} />

            <div style={{ textAlign: "center", fontSize: 12.5, color: "var(--text-dim)", marginTop: 6 }}>
              New to MediAssist?{" "}
              <Link href="/signup" style={{ color: "var(--teal-bright)", fontWeight: 600 }}>
                Create one
              </Link>
            </div>
          </div>
        </form>
      </BlurFade>
    </AuthLayout>
  );
}
