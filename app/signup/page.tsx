"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import AuthLayout from "@/components/auth/AuthLayout";
import {
  Divider,
  ErrorNote,
  Field,
  PrimaryButton,
  SsoButton,
  chipStyle,
  inputStyle,
} from "@/components/auth/fields";
import { AuthError, ROLES, Role, getSession, signUp } from "@/lib/auth";
import { BlurFade } from "@/components/magicui/blur-fade";

export default function SignupPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [organization, setOrganization] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<Role>("Physician");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const session = getSession();
    if (session) router.replace(session.onboarded ? "/" : "/onboarding");
  }, [router]);

  const submit = () => {
    setError("");
    setBusy(true);
    try {
      signUp({ name, email, password, organization, role });
      router.replace("/onboarding");
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
            submit();
          }}
        >
          <div style={{ fontSize: 24, fontWeight: 800, color: "var(--text-bright)", letterSpacing: "-0.4px" }}>
            Create your account
          </div>
          <div style={{ fontSize: 13.5, color: "var(--text-dim)", marginTop: 6 }}>
            Set up your MediAssist clinical workspace.
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 15, marginTop: 24 }}>
            <Field label="Full name">
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Dr. Jane Smith"
                style={inputStyle}
                autoComplete="name"
              />
            </Field>
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
            <Field label="Organization">
              <input
                value={organization}
                onChange={(e) => setOrganization(e.target.value)}
                placeholder="City General Hospital"
                style={inputStyle}
                autoComplete="organization"
              />
            </Field>
            <Field label="Password" hint="At least 6 characters — stored locally for this demo only.">
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Create a strong password"
                style={inputStyle}
                autoComplete="new-password"
              />
            </Field>

            <div>
              <div style={{ fontSize: 12, color: "var(--text-muted)", marginBottom: 8 }}>Role</div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                {ROLES.map((r) => (
                  <button key={r} type="button" onClick={() => setRole(r)} style={chipStyle(role === r)}>
                    {r}
                  </button>
                ))}
              </div>
            </div>

            <ErrorNote message={error} />

            <PrimaryButton type="submit" disabled={busy}>
              {busy ? "Creating account…" : "Create account"}
            </PrimaryButton>

            <Divider />

            <SsoButton onClick={() => setError("Hospital SSO isn't wired up in this demo.")} />

            <div style={{ textAlign: "center", fontSize: 12.5, color: "var(--text-dim)", marginTop: 6 }}>
              Already have an account?{" "}
              <Link href="/login" style={{ color: "var(--teal-bright)", fontWeight: 600 }}>
                Sign in
              </Link>
            </div>
          </div>
        </form>
      </BlurFade>
    </AuthLayout>
  );
}
