"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, CheckCircle2, FileText, LockKeyhole, Mail, ShieldCheck, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/components/Providers";
import { saveHamletSession, type HamletSession } from "@/lib/hamletAuth";
import { canUseLocalBypass } from "@/lib/localAuth";
import { supabase } from "@/lib/supabase";
import { API_BASE } from "@/lib/utils";

const highlights = [
  "Private proposal workspace",
  "Saved progress and export history",
  "Indigenous-context proposal guidance",
];

const prep = ["Upload grant package", "Complete community intake", "Review and export proposal"];

export function LoginScreen() {
  const router = useRouter();
  const { startHamletSession, startLocalSession } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [allowBypass, setAllowBypass] = useState(false);

  useEffect(() => {
    setAllowBypass(canUseLocalBypass());
  }, []);

  async function handleSignIn(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const username = email.trim();
    try {
      const hamletResponse = await fetch(`${API_BASE}/api/auth/hamlet-login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });
      if (hamletResponse.ok) {
        const payload = (await hamletResponse.json()) as HamletSession;
        saveHamletSession(payload);
        startHamletSession(payload);
        router.push("/dashboard");
        return;
      }
      if (!username.includes("@")) {
        const body = (await hamletResponse.json().catch(() => null)) as { detail?: string } | null;
        setError(body?.detail || "That user ID or password is not recognized.");
        return;
      }

      const { error } = await supabase.auth.signInWithPassword({ email: username, password });
      if (error) {
        setError(describeSignInError(error.message));
        return;
      }
      router.push("/dashboard");
    } catch (caught) {
      const message = caught instanceof Error ? caught.message : "Sign-in failed.";
      setError(describeSignInError(message));
    } finally {
      setLoading(false);
    }
  }

  function continueLocally() {
    startLocalSession();
  }

  return (
    <div className="min-h-screen px-4 py-6 sm:px-6 lg:px-8">
      <div className="mx-auto flex min-h-[calc(100vh-48px)] w-full max-w-[1760px] flex-col overflow-hidden rounded-2xl border border-border bg-card/80 shadow-xl lg:grid lg:grid-cols-[minmax(0,1.15fr)_minmax(420px,0.85fr)]">
        <section className="relative flex min-h-[560px] flex-col justify-between overflow-hidden border-b border-border bg-primary/5 p-6 sm:p-10 lg:border-b-0 lg:border-r">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_12%_12%,rgba(245,181,27,0.18),transparent_32%),radial-gradient(circle_at_90%_20%,rgba(7,91,143,0.14),transparent_30%),radial-gradient(circle_at_55%_95%,rgba(200,16,69,0.08),transparent_34%)]" />
          <div className="relative">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl border border-neda-gold/60 bg-neda-gold/15 text-primary">
                <FileText className="h-6 w-6" />
              </div>
              <div>
                <p className="font-semibold text-foreground">Community Grant Assistant</p>
                <p className="text-sm text-muted-foreground">Proposal workspace</p>
              </div>
            </div>

            <div className="mt-16 max-w-3xl">
              <p className="text-sm font-medium text-primary">Secure proposal workspace</p>
              <h1 className="mt-4 text-4xl font-semibold tracking-tight text-foreground sm:text-5xl">
                Sign in before entering the proposal workspace.
              </h1>
              <p className="mt-5 max-w-2xl text-lg leading-8 text-muted-foreground">
                Generate funding-ready proposals from grant packages, community context, and supporting documents while keeping your work organized.
              </p>
            </div>
          </div>

          <div className="relative mt-10 grid gap-4 sm:grid-cols-3">
            {highlights.map((item) => (
              <div key={item} className="rounded-xl border border-border bg-background/75 p-4">
                <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <ShieldCheck className="h-5 w-5" />
                </div>
                <p className="text-sm font-medium text-foreground">{item}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="flex items-center justify-center p-6 sm:p-10">
          <div className="w-full max-w-md">
            <Card>
              <CardHeader>
                <div className="mb-3 inline-flex w-fit items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.14em] text-primary">
                  <Sparkles className="h-3.5 w-3.5" />
                  Workspace access
                </div>
                <CardTitle className="text-3xl">Sign in</CardTitle>
                <CardDescription>
                  Access your saved proposals, continue active drafts, and manage your proposal workspace.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <form onSubmit={handleSignIn} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="email">User ID or email</Label>
                    <div className="relative">
                      <Mail className="pointer-events-none absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="email"
                        type="text"
                        autoComplete="username"
                        placeholder="arviat"
                        className="pl-9"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="password">Password</Label>
                    <div className="relative">
                      <LockKeyhole className="pointer-events-none absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="password"
                        type="password"
                        placeholder="********"
                        className="pl-9"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                      />
                    </div>
                  </div>

                  {error && (
                    <p className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                      {error}
                    </p>
                  )}

                  <Button type="submit" className="w-full" disabled={loading}>
                    {loading ? "Signing in…" : "Continue to dashboard"}
                    {!loading && <ArrowRight className="ml-2 h-4 w-4" />}
                  </Button>
                </form>

                {allowBypass && (
                  <div className="space-y-2 border-t border-border pt-4">
                    <Button type="button" variant="outline" className="w-full" onClick={continueLocally}>
                      Continue without signing in
                    </Button>
                    <p className="text-xs text-muted-foreground">
                      Opens the shared workspace without a Supabase account.
                    </p>
                  </div>
                )}

                <div className="rounded-lg border border-border bg-muted/30 p-3">
                  <p className="text-xs font-medium text-foreground">Generation flow</p>
                  <div className="mt-3 space-y-2">
                    {prep.map((item) => (
                      <div key={item} className="flex items-center gap-2 text-xs text-muted-foreground">
                        <CheckCircle2 className="h-3.5 w-3.5 text-primary" />
                        {item}
                      </div>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </section>
      </div>
    </div>
  );
}

function describeSignInError(message: string) {
  if (/failed to fetch/i.test(message)) {
    return "Sign-in could not reach the server. Check that the app is running, then try the user ID and password again.";
  }
  return message;
}
