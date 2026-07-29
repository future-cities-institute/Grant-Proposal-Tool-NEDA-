"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { AlertCircle, CheckCircle2, Loader2 } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  getCommunityProfile,
  saveCommunityProfile,
  type CommunityProfile,
  type CommunityProfileRecord,
} from "@/lib/api";

type ProfileValues = Partial<CommunityProfile>;
type ProfileKey = keyof CommunityProfile;
type SaveStatus = "idle" | "saving" | "saved" | "error";

const shortFields: Array<{ key: ProfileKey; label: string; placeholder: string; type?: string }> = [
  { key: "community_name", label: "Community name", placeholder: "Enter the community name." },
  { key: "region", label: "Region / Province / Territory", placeholder: "Enter the region." },
  { key: "legal_name", label: "Legal applicant name", placeholder: "Enter the legal name." },
  { key: "operating_name", label: "Operating name", placeholder: "Enter operating name or N/A." },
  { key: "applicant_type", label: "Applicant type", placeholder: "Describe the applicant type." },
  { key: "registration_number", label: "Registration number", placeholder: "Enter number, N/A, or To confirm." },
  { key: "year_established", label: "Year established", placeholder: "Enter year, N/A, or To confirm." },
  { key: "website", label: "Website", placeholder: "Enter website or N/A." },
  { key: "contact_name", label: "Primary contact", placeholder: "Enter contact name." },
  { key: "contact_title", label: "Contact title", placeholder: "Enter contact title." },
  { key: "contact_email", label: "Contact email", placeholder: "Enter contact email.", type: "email" },
  { key: "contact_phone", label: "Contact phone", placeholder: "Enter contact phone.", type: "tel" },
];

const longFields: Array<{ key: ProfileKey; label: string; placeholder: string }> = [
  { key: "mailing_address", label: "Mailing address", placeholder: "Enter the applicant mailing address." },
  { key: "applicant_profile", label: "Applicant profile / mandate", placeholder: "Describe the applicant, its mandate, experience, and who it serves." },
  { key: "indigenous_communities", label: "Indigenous community or communities", placeholder: "Name the community, Nation, or communities represented." },
  { key: "population_served", label: "Population served", placeholder: "Describe the population or service population." },
  { key: "demographic_context", label: "Demographic context", placeholder: "Describe relevant demographic, language, age, or cultural context." },
  { key: "existing_services", label: "Existing services", placeholder: "Describe relevant existing services, programs, or infrastructure." },
  { key: "service_gaps", label: "Persistent service gaps", placeholder: "Describe recurring gaps or barriers." },
  { key: "remoteness_context", label: "Geographic / remoteness context", placeholder: "Describe location, access, logistics, or remoteness considerations." },
  { key: "governance_context", label: "Governance context", placeholder: "Describe leadership, governance, and decision-making context." },
  { key: "strengths", label: "Community strengths", placeholder: "Describe assets, capabilities, relationships, and local strengths." },
  { key: "data_governance", label: "Data governance practices", placeholder: "Describe standing data ownership, consent, OCAP, or privacy practices, or enter N/A." },
  { key: "cultural_safety", label: "Cultural safety practices", placeholder: "Describe standing cultural-safety practices or enter N/A." },
];

export function CommunityProfileEditor() {
  const queryClient = useQueryClient();
  const profileQuery = useQuery({ queryKey: ["community-profile"], queryFn: getCommunityProfile });
  const [values, setValues] = useState<ProfileValues>({});
  const [saveStatus, setSaveStatus] = useState<SaveStatus>("idle");
  const [savedRecord, setSavedRecord] = useState<CommunityProfileRecord | null>(null);
  const hydratedRef = useRef(false);
  const saveChainRef = useRef<Promise<unknown>>(Promise.resolve());
  const latestSaveRef = useRef(0);
  const lastSavedValuesRef = useRef("");
  const hasSavedDetails = Object.values(savedRecord?.profile || {}).some(
    (value) => typeof value === "string" ? value.trim().length > 0 : value !== null && value !== undefined
  );

  useEffect(() => {
    if (profileQuery.isLoading || hydratedRef.current) return;
    const loadedValues = profileQuery.data?.profile || {};
    setValues(loadedValues);
    setSavedRecord(profileQuery.data || null);
    lastSavedValuesRef.current = JSON.stringify(loadedValues);
    setSaveStatus("idle");
    hydratedRef.current = true;
  }, [profileQuery.data, profileQuery.isLoading]);

  const persistValues = useCallback(
    (nextValues: ProfileValues) => {
      const serializedValues = JSON.stringify(nextValues);
      if (!hydratedRef.current || serializedValues === lastSavedValuesRef.current) {
        return Promise.resolve(null);
      }

      const saveId = latestSaveRef.current + 1;
      latestSaveRef.current = saveId;
      setSaveStatus("saving");
      const task = saveChainRef.current
        .catch(() => undefined)
        .then(async () => {
          const record = await saveCommunityProfile(nextValues);
          const responseMatches = Object.entries(nextValues).every(
            ([key, value]) => record.profile[key as ProfileKey] === value
          );
          if (!responseMatches) throw new Error("The saved profile did not match the submitted values.");
          return record;
        });
      saveChainRef.current = task;
      void task.then(
        (record) => {
          setSavedRecord(record);
          lastSavedValuesRef.current = JSON.stringify(record.profile);
          queryClient.setQueryData(["community-profile"], record);
          if (latestSaveRef.current === saveId) setSaveStatus("saved");
        },
        () => {
          if (latestSaveRef.current === saveId) setSaveStatus("error");
        }
      );
      return task;
    },
    [queryClient]
  );

  useEffect(() => {
    if (!hydratedRef.current) return;
    if (JSON.stringify(values) === lastSavedValuesRef.current) return;
    setSaveStatus("saving");
    const timeoutId = window.setTimeout(() => {
      void persistValues(values);
    }, 1200);
    return () => window.clearTimeout(timeoutId);
  }, [persistValues, values]);

  const updateValue = (key: ProfileKey, value: string) => {
    setSaveStatus("saving");
    setValues((current) => ({ ...current, [key]: value }));
  };

  if (profileQuery.isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center gap-2 p-6 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" /> Loading community profile...
        </CardContent>
      </Card>
    );
  }

  if (profileQuery.isError) {
    return (
      <Card className="border-destructive/40">
        <CardContent className="flex items-center gap-2 p-6 text-sm text-destructive">
          <AlertCircle className="h-4 w-4" /> Community profile could not be loaded.
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <CardTitle>Community Profile</CardTitle>
            <CardDescription className="mt-2 max-w-3xl">
              Save stable applicant and community information once. New proposals will use a snapshot of this profile and ask only for application-specific details.
            </CardDescription>
          </div>
          <div className="text-sm" role="status">
            {saveStatus === "saving" && <span className="flex items-center gap-2 text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" /> Saving...</span>}
            {saveStatus === "saved" && <span className="flex items-center gap-2 text-emerald-500"><CheckCircle2 className="h-4 w-4" /> Saved</span>}
            {saveStatus === "error" && <span className="flex items-center gap-2 text-destructive"><AlertCircle className="h-4 w-4" /> Save failed; your entries remain here.</span>}
          </div>
        </div>
        {savedRecord?.updated_at && hasSavedDetails && (
          <p className="text-xs text-muted-foreground">Last saved {new Date(savedRecord.updated_at).toLocaleString()}</p>
        )}
      </CardHeader>
      <CardContent className="space-y-6" onBlur={() => void persistValues(values)}>
        {!hasSavedDetails && (
          <div className="rounded-lg border border-amber-500/35 bg-amber-500/10 p-3 text-sm">
            <p className="font-medium text-foreground">No Community Profile details have been saved yet.</p>
            <p className="mt-1 text-muted-foreground">Complete the reusable fields below, then select Save Community Profile.</p>
          </div>
        )}
        <div className="grid gap-4 sm:grid-cols-2">
          {shortFields.map((field) => (
            <div key={field.key} className="space-y-2">
              <Label htmlFor={`profile-${field.key}`}>{field.label}</Label>
              <Input
                id={`profile-${field.key}`}
                type={field.type || "text"}
                value={String(values[field.key] ?? "")}
                onChange={(event) => updateValue(field.key, event.target.value)}
                placeholder={field.placeholder}
              />
            </div>
          ))}
        </div>
        <div className="space-y-4">
          {longFields.map((field) => (
            <div key={field.key} className="space-y-2">
              <Label htmlFor={`profile-${field.key}`}>{field.label}</Label>
              <Textarea
                id={`profile-${field.key}`}
                value={String(values[field.key] ?? "")}
                onChange={(event) => updateValue(field.key, event.target.value)}
                placeholder={field.placeholder}
                rows={3}
              />
            </div>
          ))}
        </div>
        <div className="flex flex-wrap items-center gap-3 border-t border-border pt-5">
          <Button type="button" onClick={() => void persistValues(values)} disabled={saveStatus === "saving"}>
            {saveStatus === "saving" ? "Saving..." : "Save Community Profile"}
          </Button>
          <p className="text-sm text-muted-foreground">
            Changes also save automatically after you pause or leave a field.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
