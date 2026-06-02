"use client";

import { useEffect, useState } from "react";
import { Database, KeyRound, Mail, Save, UserRound } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { useAuth } from "@/components/Providers";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/lib/supabase";

export default function AccountPage() {
  const { user } = useAuth();
  const [name, setName] = useState("");
  const [status, setStatus] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    const metadata = user?.user_metadata || {};
    setName(String(metadata.full_name || metadata.name || user?.email?.split("@")[0] || ""));
  }, [user]);

  const saveProfile = async () => {
    const nextName = name.trim();
    if (!nextName) {
      setStatus("Enter a name before saving.");
      return;
    }

    setIsSaving(true);
    setStatus("");
    const { error } = await supabase.auth.updateUser({
      data: {
        full_name: nextName,
        name: nextName,
      },
    });
    if (error) {
      setStatus(error.message);
    } else {
      await supabase.auth.refreshSession();
      setStatus("Profile saved.");
    }
    setIsSaving(false);
  };

  return (
    <AppShell>
      <div className="space-y-8">
        <section>
          <p className="text-sm font-medium text-primary">Workspace settings</p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight text-foreground">Account</h1>
          <p className="mt-2 max-w-2xl text-muted-foreground">
            Manage your profile, proposal materials, and workspace preferences.
          </p>
        </section>

        <div className="grid gap-6 lg:grid-cols-[1fr_340px]">
          <section className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Profile</CardTitle>
              <CardDescription>
                Keep your account details current for saved proposal activity and exports.
              </CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="name">Name</Label>
                <div className="relative">
                  <UserRound className="pointer-events-none absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="name"
                    value={name}
                    onChange={(event) => setName(event.target.value)}
                    className="pl-9"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="account-email">Email</Label>
                <div className="relative">
                  <Mail className="pointer-events-none absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="account-email"
                    value={user?.email || ""}
                    readOnly
                    className="pl-9"
                  />
                </div>
              </div>
              <div className="flex flex-col gap-2 sm:col-span-2 sm:flex-row sm:items-center">
                <Button onClick={saveProfile} disabled={isSaving}>
                  <Save className="mr-2 h-4 w-4" />
                  {isSaving ? "Saving..." : "Save profile"}
                </Button>
                {status && (
                  <p className="text-sm text-muted-foreground">{status}</p>
                )}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Data controls</CardTitle>
              <CardDescription>
                Control saved proposals, uploaded grant packages, and generated drafts.
              </CardDescription>
            </CardHeader>
            <CardContent className="grid gap-3 sm:grid-cols-2">
              {[
                "Delete saved proposal",
                "Download proposal data",
                "Remove uploaded grant package",
                "Clear generated drafts",
              ].map((action) => (
                <Button key={action} variant="outline" className="justify-start">
                  {action}
                </Button>
              ))}
            </CardContent>
          </Card>
        </section>

          <aside className="space-y-6">
          <Card>
            <CardHeader>
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <KeyRound className="h-5 w-5" />
              </div>
              <CardTitle className="text-base">Account security</CardTitle>
              <CardDescription>
                Account access protects your proposal workspace and saved progress.
              </CardDescription>
            </CardHeader>
          </Card>

          <Card>
            <CardHeader>
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <Database className="h-5 w-5" />
              </div>
              <CardTitle className="text-base">Proposal storage</CardTitle>
              <CardDescription>
                Proposal records and uploaded files stay organized for future editing and export.
              </CardDescription>
            </CardHeader>
          </Card>
          </aside>
        </div>
      </div>
    </AppShell>
  );
}
