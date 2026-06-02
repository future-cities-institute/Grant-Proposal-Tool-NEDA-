"use client";

import Link from "next/link";
import { ArrowRight, BookOpen, CheckCircle2, FileQuestion, ListChecks, Users } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

const resourceGroups = [
  {
    title: "Before generation",
    icon: FileQuestion,
    items: [
      "Confirm the applicant name, applicant type, and signing authority.",
      "Gather the grant guidelines, budget rules, eligible activities, and required attachments.",
      "Prepare a clear project rationale, timeline, requested funding amount, and partner roles.",
    ],
  },
  {
    title: "Indigenous context",
    icon: Users,
    items: [
      "Describe how community priorities were identified and who was involved.",
      "Name governance, engagement, consent, and knowledge-protection considerations where relevant.",
      "Avoid assuming sensitive cultural, research, or data-governance details that the user has not provided.",
    ],
  },
  {
    title: "Review checklist",
    icon: ListChecks,
    items: [
      "Check every grant question has a distinct answer.",
      "Review low-confidence cards and missing-info prompts before export.",
      "Confirm budget, outcomes, timeline, and supporting documents align with the funder requirements.",
    ],
  },
];

export default function ResourcesPage() {
  return (
    <AppShell>
      <div className="space-y-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-sm font-medium text-primary">Proposal support</p>
            <h1 className="mt-2 text-3xl font-semibold tracking-tight text-foreground">Resources</h1>
            <p className="mt-2 max-w-2xl text-muted-foreground">
              Guidance to help prepare stronger proposal inputs, review generated sections, and export with confidence.
            </p>
          </div>
          <Link href="/proposal">
            <Button>
              Start New Proposal
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </Link>
        </div>

        <div className="grid gap-5 lg:grid-cols-3">
          {resourceGroups.map((group) => {
            const Icon = group.icon;
            return (
              <Card key={group.title}>
                <CardHeader>
                  <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-primary/10 text-primary">
                    <Icon className="h-5 w-5" />
                  </div>
                  <CardTitle className="text-lg">{group.title}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {group.items.map((item) => (
                    <div key={item} className="flex gap-3 text-sm text-muted-foreground">
                      <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                      <span>{item}</span>
                    </div>
                  ))}
                </CardContent>
              </Card>
            );
          })}
        </div>

        <Card className="border-primary/25 bg-primary/5">
          <CardHeader>
            <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-background/50 text-primary">
              <BookOpen className="h-5 w-5" />
            </div>
            <CardTitle>Proposal workflow</CardTitle>
            <CardDescription>
              The workspace guides you from grant package upload, to community intake, to generated proposal review, missing-info edits, and export.
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    </AppShell>
  );
}
