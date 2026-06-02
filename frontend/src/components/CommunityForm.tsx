"use client";

import { useState, type ChangeEvent, type ReactNode } from "react";
import { useForm, type Path } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { parseSupportingDocument, type CommunityProfile } from "@/lib/api";
import { AlertCircle, ChevronDown, FileText, Loader2 } from "lucide-react";

const requiredText = (label: string) => z.string().trim().min(1, `${label} is required`);

const schema = z.object({
  community_name: requiredText("Community name"),
  region: requiredText("Region / Province"),
  local_priority: requiredText("Local priority"),
  legal_name: requiredText("Legal applicant name"),
  operating_name: requiredText("Operating name"),
  applicant_type: requiredText("Applicant type"),
  applicant_profile: requiredText("Applicant profile / mandate"),
  registration_number: requiredText("CRA/business/registration number or N/A"),
  year_established: requiredText("Year established or To confirm"),
  contact_name: requiredText("Primary contact name"),
  contact_title: requiredText("Primary contact title"),
  contact_email: requiredText("Primary contact email"),
  contact_phone: requiredText("Primary contact phone"),
  mailing_address: requiredText("Mailing address"),
  website: requiredText("Website or N/A"),
  indigenous_communities: requiredText("Indigenous community or communities"),
  population_served: requiredText("Population or service population"),
  demographic_context: requiredText("Demographic context"),
  existing_services: requiredText("Existing services"),
  service_gaps: requiredText("Service gaps"),
  remoteness_context: requiredText("Geographic/remoteness context"),
  governance_context: requiredText("Governance context"),
  project_title: requiredText("Project title"),
  project_type: requiredText("Project type"),
  project_stage: requiredText("Project stage"),
  project_location: requiredText("Project location"),
  timeline: requiredText("Timeline"),
  project_summary: requiredText("Project summary"),
  project_objectives: requiredText("Project objectives"),
  project_activities: requiredText("Activities and deliverables"),
  expected_outputs: requiredText("Expected outputs / deliverables"),
  staffing_plan: requiredText("Staffing/team roles"),
  project_management_approach: requiredText("Project management approach"),
  challenges: requiredText("Key challenges"),
  strengths: requiredText("Community strengths"),
  partners: requiredText("Partners"),
  target_beneficiaries: requiredText("Who benefits"),
  direct_beneficiaries: requiredText("Direct beneficiaries"),
  indirect_beneficiaries: requiredText("Indirect beneficiaries"),
  expected_outcomes: requiredText("Expected outcomes"),
  quantitative_indicators: requiredText("Quantitative indicators"),
  qualitative_indicators: requiredText("Qualitative indicators"),
  baseline_conditions: requiredText("Baseline conditions"),
  baseline_data_collection: requiredText("Baseline data collection"),
  success_measurement: requiredText("Success measurement"),
  community_support_status: requiredText("Community support status"),
  community_engagement: requiredText("Community engagement"),
  approvals_status: requiredText("Approvals/supporting documents status"),
  elders_involvement: requiredText("Elders involvement or N/A"),
  knowledge_keepers_involvement: requiredText("Knowledge Keepers involvement or N/A"),
  youth_involvement: requiredText("Youth involvement or N/A"),
  data_governance: requiredText("Data governance / OCAP or N/A"),
  cultural_safety: requiredText("Cultural safety considerations or N/A"),
  evidence_note: requiredText("Evidence or supporting data"),
  why_now: requiredText("Why now"),
  requested_budget: z.coerce.number().min(10000).max(5_000_000),
  total_project_cost: z.coerce.number().min(0).max(50_000_000),
  budget_personnel: requiredText("Personnel costs or N/A"),
  budget_professional_services: requiredText("Professional services costs or N/A"),
  budget_equipment_materials: requiredText("Equipment/materials costs or N/A"),
  budget_travel_logistics: requiredText("Travel/shipping/logistics costs or N/A"),
  budget_training: requiredText("Training costs or N/A"),
  budget_evaluation: requiredText("Evaluation/reporting costs or N/A"),
  budget_admin: requiredText("Administration/overhead costs or N/A"),
  budget_contingency: requiredText("Contingency costs or N/A"),
  budget_breakdown: requiredText("Budget breakdown"),
  budget_assumptions: requiredText("Budget assumptions"),
  other_funding_status: requiredText("Other funding status"),
  other_funding: requiredText("Other funding or in-kind support"),
  risks_and_mitigation: requiredText("Risks and mitigation"),
  risk_likelihood: requiredText("Risk likelihood"),
  risk_impact: requiredText("Risk impact"),
  mitigation_plan: requiredText("Mitigation and contingency plan"),
  sustainability_plan: requiredText("Sustainability plan"),
  maintenance_requirements: requiredText("Maintenance requirements"),
  ownership_model: requiredText("Community ownership / operations model"),
  future_funding_sources: requiredText("Future funding/revenue sources or N/A"),
  scaling_plan: requiredText("Scaling or replication plan or N/A"),
  supporting_documents_text: requiredText("Supporting document context"),
});

export type CommunityFormValues = z.infer<typeof schema>;

const selectClassName =
  "flex h-12 w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2";

const blankValues: CommunityFormValues = {
  community_name: "",
  region: "",
  local_priority: "",
  legal_name: "",
  operating_name: "",
  applicant_type: "",
  applicant_profile: "",
  registration_number: "",
  year_established: "",
  contact_name: "",
  contact_title: "",
  contact_email: "",
  contact_phone: "",
  mailing_address: "",
  website: "",
  indigenous_communities: "",
  population_served: "",
  demographic_context: "",
  existing_services: "",
  service_gaps: "",
  remoteness_context: "",
  governance_context: "",
  project_title: "",
  project_type: "",
  project_stage: "",
  project_location: "",
  timeline: "",
  project_summary: "",
  project_objectives: "",
  project_activities: "",
  expected_outputs: "",
  staffing_plan: "",
  project_management_approach: "",
  challenges: "",
  strengths: "",
  partners: "",
  target_beneficiaries: "",
  direct_beneficiaries: "",
  indirect_beneficiaries: "",
  expected_outcomes: "",
  quantitative_indicators: "",
  qualitative_indicators: "",
  baseline_conditions: "",
  baseline_data_collection: "",
  success_measurement: "",
  community_support_status: "",
  community_engagement: "",
  approvals_status: "",
  elders_involvement: "",
  knowledge_keepers_involvement: "",
  youth_involvement: "",
  data_governance: "",
  cultural_safety: "",
  evidence_note: "",
  why_now: "",
  requested_budget: 250000,
  total_project_cost: 0,
  budget_personnel: "",
  budget_professional_services: "",
  budget_equipment_materials: "",
  budget_travel_logistics: "",
  budget_training: "",
  budget_evaluation: "",
  budget_admin: "",
  budget_contingency: "",
  budget_breakdown: "",
  budget_assumptions: "",
  other_funding_status: "",
  other_funding: "",
  risks_and_mitigation: "",
  risk_likelihood: "",
  risk_impact: "",
  mitigation_plan: "",
  sustainability_plan: "",
  maintenance_requirements: "",
  ownership_model: "",
  future_funding_sources: "",
  scaling_plan: "",
  supporting_documents_text: "",
};

const demoValues: CommunityFormValues = {
  community_name: "Kinngait",
  region: "Nunavut",
  local_priority: "Improve reliable year-round access to clean drinking water",
  legal_name: "Hamlet of Kinngait",
  operating_name: "Kinngait",
  applicant_type: "Indigenous municipal or local government",
  applicant_profile:
    "The Hamlet of Kinngait is the local government serving Kinngait residents and coordinating municipal services, public works, community infrastructure planning, and local service delivery. The applicant has direct knowledge of community infrastructure needs, established accountability to local leadership and residents, and practical experience coordinating public works, technical advisors, procurement, and reporting for community projects.",
  registration_number: "N/A - municipal/local government applicant",
  year_established: "Municipal/local government applicant; formal establishment year is not required for this demo application",
  contact_name: "Community Infrastructure Project Lead",
  contact_title: "Senior Administrative Officer or designated project lead",
  contact_email: "infrastructure@example.ca",
  contact_phone: "867-555-0142",
  mailing_address: "Hamlet Office, Kinngait, Nunavut, X0A 0C0",
  website: "N/A",
  indigenous_communities: "Kinngait, an Inuit community in Nunavut",
  population_served:
    "Approximately 1,500 residents across Kinngait, including households, Elders, families, municipal facilities, and community service providers that rely on safe and reliable water service.",
  demographic_context:
    "The project will serve residents across the community, including Elders, families with young children, public works staff, and community facilities that depend on reliable water service.",
  existing_services:
    "The Hamlet and public works team currently operate and maintain local water infrastructure and coordinate service response with regional technical support.",
  service_gaps:
    "Aging infrastructure, seasonal shipping constraints, and limited local maintenance capacity contribute to service disruptions and delayed repairs.",
  remoteness_context:
    "Kinngait's northern location and seasonal logistics increase costs, constrain construction windows, and require early procurement and careful scheduling.",
  governance_context:
    "The project will be guided by Hamlet leadership, local public works expertise, and community feedback through council and resident engagement channels.",
  project_title: "Kinngait Water Infrastructure Reliability Project",
  project_type: "Community infrastructure",
  project_stage: "Implementation ready",
  project_location: "Kinngait, Nunavut",
  timeline: "Planning in Q2 2026, implementation Q3-Q4 2026, evaluation Q1 2027",
  project_summary:
    "Upgrade critical water infrastructure and strengthen local maintenance practices to reduce disruptions and improve reliable access to clean water.",
  project_objectives:
    "Improve water service reliability, reduce avoidable disruptions, strengthen local operator capacity, and create better evidence for future infrastructure planning.",
  project_activities:
    "Complete technical assessment, finalize design, procure materials, coordinate seasonal shipping, install priority upgrades, train local operators, and monitor performance.",
  expected_outputs:
    "Completed technical assessment, finalized design package, procured and installed priority components, operator training materials, updated maintenance procedures, monitoring records, and final project report.",
  staffing_plan:
    "Hamlet leadership will oversee delivery, public works staff will support implementation and maintenance, regional technical advisors will review design and installation, and the local health team will support outcome tracking.",
  project_management_approach:
    "The project will use a phased workplan with council oversight, regular check-ins with technical advisors, procurement tracking, risk monitoring, and documented milestones.",
  challenges:
    "Aging infrastructure causes service disruptions and boil-water advisories. Seasonal logistics increase maintenance delays and cost.",
  strengths:
    "Strong local leadership, an experienced public works team, and active resident participation in planning sessions increase project readiness.",
  partners:
    "Hamlet council (project oversight), regional technical advisors (design review), local public works team (implementation), and local health team (outcomes tracking).",
  target_beneficiaries:
    "Residents, Elders, families with young children, public works staff, and community facilities that depend on reliable water service.",
  direct_beneficiaries:
    "Approximately 1,500 residents and core community facilities will directly benefit through more reliable water service, fewer disruptions, and stronger local maintenance capacity.",
  indirect_beneficiaries:
    "Visitors, service providers, surrounding organizations, and future community projects that depend on reliable municipal infrastructure.",
  expected_outcomes:
    "Fewer service disruptions, improved confidence in local water systems, stronger maintenance capacity, and clearer evidence for future infrastructure planning.",
  quantitative_indicators:
    "Number of service disruptions, number/duration of boil-water advisories, operators trained, milestones completed on schedule, and maintenance response time.",
  qualitative_indicators:
    "Resident confidence in water reliability, staff confidence in maintenance procedures, and feedback from Elders, service users, and community facilities.",
  baseline_conditions:
    "Baseline conditions include recent disruptions, boil-water advisories, maintenance delays, and current operator capacity before upgrades are implemented.",
  baseline_data_collection:
    "Collect baseline data from public works records, advisory history, maintenance logs, council notes, and pre-project feedback from service users.",
  success_measurement:
    "Compare pre- and post-project service records, maintenance logs, training completion, resident feedback, and final technical review findings.",
  community_support_status: "Community support confirmed",
  community_engagement:
    "Residents will be updated through council meetings and local notices, with feedback gathered from public works staff, Elders, and service users.",
  approvals_status:
    "Council support is expected; attach council motion, letter of support, or equivalent approval when available.",
  elders_involvement:
    "Elders will be invited to provide feedback on community priorities and lived impacts of water service disruptions.",
  knowledge_keepers_involvement:
    "Knowledge Keepers and long-term residents will be invited to share observations about seasonal conditions, community priorities, and past service disruptions that should inform planning and communication.",
  youth_involvement:
    "Youth perspectives will be gathered through school/community facility feedback where appropriate, with a focus on how reliable water service supports families, recreation, learning spaces, and daily wellbeing.",
  data_governance:
    "Community-held records and feedback will be used with local approval and reported in aggregate to respect community control over information.",
  cultural_safety:
    "Engagement will use plain language, respect local decision-making processes, and avoid collecting unnecessary personal information.",
  evidence_note:
    "Recent service disruptions, boil-water advisories, and maintenance delays demonstrate the urgency of improving system reliability.",
  why_now:
    "The project is timely because aging infrastructure and rising logistics costs make early action more cost-effective than repeated emergency response.",
  requested_budget: 350000,
  total_project_cost: 390000,
  budget_personnel: "Project coordination and local staff time for implementation and reporting.",
  budget_professional_services: "Engineering/design review and technical advisory support.",
  budget_equipment_materials: "Priority infrastructure components, replacement parts, materials, and installation supplies.",
  budget_travel_logistics: "Seasonal shipping, freight, and travel/logistics required for northern delivery.",
  budget_training: "Operator training and documentation of maintenance procedures.",
  budget_evaluation: "Monitoring, data collection, final reporting, and outcome assessment.",
  budget_admin: "Administrative coordination and financial reporting support.",
  budget_contingency: "Contingency for shipping delays, cost escalation, or urgent replacement needs.",
  budget_breakdown:
    "Engineering/design, materials and shipping, installation, operator training, contingency, and evaluation/reporting.",
  budget_assumptions:
    "Budget assumes seasonal shipping windows, local staff participation, technical advisory support, and contingency for northern procurement costs.",
  other_funding_status: "In-kind support confirmed",
  other_funding:
    "In-kind project oversight from Hamlet staff and technical review support from regional advisors.",
  risks_and_mitigation:
    "Shipping delays and short construction seasons will be managed through early procurement, phased scheduling, and contingency planning.",
  risk_likelihood:
    "Moderate likelihood overall, with higher likelihood for shipping delays, weather interruptions, and price volatility because of northern delivery constraints.",
  risk_impact:
    "Potential impacts include schedule delays, increased freight or materials costs, and temporary pressure on local staff capacity if procurement or installation windows shift.",
  mitigation_plan:
    "Mitigation will include early procurement, phased scheduling, technical review before ordering, regular risk check-ins, documented contingency decisions, and use of the contingency budget for urgent logistics or replacement needs.",
  sustainability_plan:
    "Training local operators and documenting maintenance procedures will help the community sustain improvements after the grant period.",
  maintenance_requirements:
    "Ongoing maintenance will require routine inspections, operator checklists, spare parts tracking, seasonal review of vulnerable components, and continued coordination between Hamlet leadership, public works staff, and technical advisors.",
  ownership_model:
    "The Hamlet will remain accountable for local oversight, operations, records, and maintenance decisions, with public works staff carrying forward day-to-day procedures and council receiving updates through regular reporting.",
  future_funding_sources:
    "Future funding may include territorial infrastructure programs, federal Indigenous/community infrastructure streams, and annual municipal capital planning informed by the project's maintenance records and evaluation results.",
  scaling_plan:
    "Lessons from the project can inform future maintenance planning and other water reliability upgrades in the community.",
  supporting_documents_text:
    "Supporting notes: Council discussions identified water reliability as a priority for residents and community facilities. Public works staff report that aging components, shipping delays, and limited local maintenance capacity contribute to service interruptions. Regional advisors have indicated that early procurement, operator training, and phased implementation will reduce delivery risk. Community feedback emphasizes reliable access for Elders, families, health services, and public facilities.",
};

const applicantTypeOptions = [
  "Indigenous government or Nation",
  "Band council",
  "Tribal council or regional Indigenous organization",
  "Indigenous non-profit or community organization",
  "Indigenous municipal or local government",
  "Municipality or non-Indigenous partner with Indigenous lead",
  "Other eligible applicant",
];

const projectTypeOptions = [
  "Community infrastructure",
  "Housing or land use planning",
  "Economic development",
  "Climate adaptation or environmental stewardship",
  "Health, safety, or wellbeing",
  "Culture, language, or knowledge keeping",
  "Capacity building or training",
  "Technology or data systems",
  "Other community priority",
];

const projectStageOptions = [
  "Idea or early planning",
  "Planning and design underway",
  "Implementation ready",
  "Expansion of existing work",
  "Evaluation or next phase",
];

const supportStatusOptions = [
  "Community support confirmed",
  "Leadership support confirmed",
  "Engagement completed",
  "Engagement underway",
  "Engagement planned",
  "To confirm",
];

const fundingStatusOptions = [
  "No other funding yet",
  "In-kind support confirmed",
  "Cash contribution confirmed",
  "Cash and in-kind support confirmed",
  "Other funding pending",
  "Mixed confirmed and pending support",
  "To confirm",
];

const sectionFields = {
  applicant: [
    "legal_name",
    "operating_name",
    "applicant_type",
    "applicant_profile",
    "registration_number",
    "year_established",
    "website",
    "contact_name",
    "contact_title",
    "contact_email",
    "contact_phone",
    "mailing_address",
  ],
  community: [
    "community_name",
    "region",
    "indigenous_communities",
    "population_served",
    "demographic_context",
    "existing_services",
    "service_gaps",
    "remoteness_context",
    "governance_context",
    "local_priority",
    "challenges",
    "strengths",
    "partners",
  ],
  project: [
    "project_title",
    "project_location",
    "project_type",
    "project_stage",
    "timeline",
    "requested_budget",
    "total_project_cost",
    "project_summary",
    "project_objectives",
    "project_activities",
    "expected_outputs",
    "staffing_plan",
    "project_management_approach",
  ],
  engagement: [
    "community_support_status",
    "approvals_status",
    "community_engagement",
    "elders_involvement",
    "knowledge_keepers_involvement",
    "youth_involvement",
    "data_governance",
    "cultural_safety",
  ],
  evidence: [
    "evidence_note",
    "why_now",
    "target_beneficiaries",
    "direct_beneficiaries",
    "indirect_beneficiaries",
    "expected_outcomes",
    "quantitative_indicators",
    "qualitative_indicators",
    "baseline_conditions",
    "baseline_data_collection",
    "success_measurement",
  ],
  budget: [
    "other_funding_status",
    "budget_assumptions",
    "budget_personnel",
    "budget_professional_services",
    "budget_equipment_materials",
    "budget_travel_logistics",
    "budget_training",
    "budget_evaluation",
    "budget_admin",
    "budget_contingency",
    "budget_breakdown",
    "other_funding",
    "risks_and_mitigation",
    "risk_likelihood",
    "risk_impact",
    "mitigation_plan",
    "sustainability_plan",
    "maintenance_requirements",
    "ownership_model",
    "future_funding_sources",
    "scaling_plan",
  ],
  supporting: ["supporting_documents_text"],
} satisfies Record<string, Path<CommunityFormValues>[]>;

type SectionKey = keyof typeof sectionFields;

export function CommunityForm({
  onSubmit,
  isSubmitting,
  error,
  onBack,
}: {
  onSubmit: (values: CommunityProfile & { requested_budget: number }) => void;
  isSubmitting: boolean;
  error?: string;
  onBack: () => void;
}) {
  const [supportingDocNames, setSupportingDocNames] = useState<string[]>([]);
  const [supportingDocError, setSupportingDocError] = useState("");
  const [isParsingSupportingDocs, setIsParsingSupportingDocs] = useState(false);
  const [openSections, setOpenSections] = useState<Record<SectionKey, boolean>>({
    applicant: true,
    community: false,
    project: false,
    engagement: false,
    evidence: false,
    budget: false,
    supporting: false,
  });
  const {
    register,
    handleSubmit,
    reset,
    setValue,
    formState: { errors },
  } = useForm<CommunityFormValues>({
    resolver: zodResolver(schema),
    defaultValues: blankValues,
  });

  const renderError = (name: Path<CommunityFormValues>) =>
    errors[name] ? <p className="text-sm text-destructive">{errors[name]?.message}</p> : null;

  const renderInput = (
    name: Path<CommunityFormValues>,
    label: string,
    placeholder: string,
    type: "text" | "email" | "tel" | "number" = "text"
  ) => (
    <div className="space-y-2">
      <Label htmlFor={name}>{label} *</Label>
      <Input id={name} type={type} {...register(name)} placeholder={placeholder} />
      {renderError(name)}
    </div>
  );

  const renderTextarea = (
    name: Path<CommunityFormValues>,
    label: string,
    placeholder: string,
    rows = 3
  ) => (
    <div className="space-y-2">
      <Label htmlFor={name}>{label} *</Label>
      <Textarea id={name} {...register(name)} rows={rows} placeholder={placeholder} />
      {renderError(name)}
    </div>
  );

  const renderSelect = (name: Path<CommunityFormValues>, label: string, options: string[]) => (
    <div className="space-y-2">
      <Label htmlFor={name}>{label} *</Label>
      <select id={name} {...register(name)} className={selectClassName}>
        <option value="">Select {label.toLowerCase()}</option>
        {options.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
      {renderError(name)}
    </div>
  );

  const countSectionErrors = (sectionKey: SectionKey) =>
    sectionFields[sectionKey].filter((field) => errors[field]).length;

  const expandSectionsWithErrors = (formErrors: Partial<Record<Path<CommunityFormValues>, unknown>>) => {
    setOpenSections((current) => {
      const next = { ...current };
      (Object.entries(sectionFields) as [SectionKey, Path<CommunityFormValues>[]][]).forEach(([sectionKey, fields]) => {
        if (fields.some((field) => field in formErrors)) {
          next[sectionKey] = true;
        }
      });
      return next;
    });
  };

  const renderSectionCard = (
    sectionKey: SectionKey,
    title: string,
    description: string,
    children: ReactNode
  ) => {
    const isOpen = openSections[sectionKey];
    const errorCount = countSectionErrors(sectionKey);

    return (
      <section className="overflow-hidden rounded-lg border border-border bg-muted/20">
        <button
          type="button"
          className="flex w-full items-start justify-between gap-4 p-4 text-left transition hover:bg-muted/30"
          onClick={() => setOpenSections((current) => ({ ...current, [sectionKey]: !current[sectionKey] }))}
          aria-expanded={isOpen}
        >
          <div>
            <h3 className="font-medium">{title}</h3>
            <p className="mt-1 text-sm text-muted-foreground">{description}</p>
          </div>
          <div className="flex shrink-0 items-center gap-3">
            {errorCount > 0 && (
              <span className="rounded-full border border-destructive/40 bg-destructive/10 px-2.5 py-1 text-xs font-medium text-destructive">
                {errorCount} to fix
              </span>
            )}
            <ChevronDown
              className={`mt-1 h-5 w-5 text-muted-foreground transition-transform ${isOpen ? "rotate-180" : ""}`}
            />
          </div>
        </button>
        {isOpen && <div className="space-y-4 border-t border-border p-4">{children}</div>}
      </section>
    );
  };

  const loadDemoData = () => {
    setSupportingDocNames(["demo-community-support-notes.txt"]);
    setSupportingDocError("");
    setOpenSections({
      applicant: true,
      community: true,
      project: true,
      engagement: true,
      evidence: true,
      budget: true,
      supporting: true,
    });
    reset(demoValues);
  };

  const handleSupportingDocs = async (event: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    if (files.length === 0) return;
    setSupportingDocError("");
    setIsParsingSupportingDocs(true);
    try {
      const parsed = await Promise.all(files.map((file) => parseSupportingDocument(file)));
      setSupportingDocNames(parsed.map((item) => item.filename));
      setValue(
        "supporting_documents_text",
        parsed.map((item) => `Source: ${item.filename}\n${item.raw_text}`).join("\n\n---\n\n"),
        { shouldDirty: true, shouldValidate: true }
      );
    } catch (err) {
      setSupportingDocError(err instanceof Error ? err.message : "Could not parse supporting document.");
    } finally {
      setIsParsingSupportingDocs(false);
      event.target.value = "";
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Community & project info</CardTitle>
        <CardDescription>
          Complete the intake so generated answers have enough verified context. Use N/A or To confirm where a required field does not apply.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form
          onSubmit={handleSubmit((values) => {
            onSubmit({
              ...values,
              indicators_before: undefined,
              indicators_after: undefined,
              scenario: undefined,
            });
          }, expandSectionsWithErrors)}
          className="space-y-6"
        >
          {renderSectionCard(
            "applicant",
            "Applicant Details",
            "Legal identity, eligibility, and contact information.",
            <>
            <div className="grid gap-4 sm:grid-cols-2">
              {renderInput("legal_name", "Legal applicant name", "Enter the legal name used on the application.")}
              {renderInput("operating_name", "Operating name", "Enter operating name, or N/A if same as legal name.")}
              {renderSelect("applicant_type", "Applicant type", applicantTypeOptions)}
              {renderInput("registration_number", "CRA/business/registration number", "Enter number, N/A, or To confirm.")}
              {renderInput("year_established", "Year established", "Enter year established, N/A, or To confirm.")}
              {renderInput("website", "Website", "Enter website, public profile, or N/A.")}
              {renderInput("contact_name", "Primary contact name", "Enter contact name.")}
              {renderInput("contact_title", "Primary contact title", "Enter contact title.")}
              {renderInput("contact_email", "Primary contact email", "Enter contact email.", "email")}
              {renderInput("contact_phone", "Primary contact phone", "Enter contact phone.", "tel")}
            </div>
            {renderTextarea(
              "applicant_profile",
              "Applicant profile / mandate",
              "Describe who the applicant is, its mandate, who it serves, relevant experience, and why it is the right lead.",
              4
            )}
            {renderTextarea("mailing_address", "Mailing address", "Enter mailing address or To confirm.", 2)}
            </>
          )}

          {renderSectionCard(
            "community",
            "Community Context",
            "Community profile, need, services, strengths, and local context.",
            <>
            <div className="grid gap-4 sm:grid-cols-2">
              {renderInput("community_name", "Community name", "Enter community name.")}
              {renderInput("region", "Region / Province", "Enter province, territory, or region.")}
            </div>
            {renderTextarea("indigenous_communities", "Indigenous community or communities", "Name the Indigenous community, Nation, or communities involved.")}
            {renderTextarea("population_served", "Population or service population", "Enter population, service area, or To confirm.", 2)}
            {renderTextarea("demographic_context", "Demographic context", "Describe priority groups, age groups, language/cultural context, or N/A.", 3)}
            {renderTextarea("existing_services", "Existing services", "Describe current services/programs/infrastructure related to this project.", 3)}
            {renderTextarea("service_gaps", "Service gaps", "Describe gaps, constraints, waitlists, disruptions, unmet needs, or missing capacity.", 3)}
            {renderTextarea("remoteness_context", "Geographic/remoteness context", "Describe remoteness, access, climate, shipping, labour, or logistics context.", 3)}
            {renderTextarea("governance_context", "Governance context", "Describe local governance, leadership, approvals, or decision-making context.", 3)}
            {renderTextarea("local_priority", "Local priority", "Describe the top local priority this project addresses and why it matters now.", 3)}
            {renderTextarea("challenges", "Key challenges", "Include specific examples of the biggest challenges the community is facing.", 3)}
            {renderTextarea("strengths", "Community strengths", "Describe assets, existing capacity, relationships, and readiness factors.", 3)}
            {renderTextarea("partners", "Partners", "List partner organizations and each partner's role. Enter N/A if none.", 3)}
            </>
          )}

          {renderSectionCard(
            "project",
            "Project Design",
            "What will be delivered, where, by whom, and how.",
            <>
            <div className="grid gap-4 sm:grid-cols-2">
              {renderInput("project_title", "Project title", "Enter the proposal/project title.")}
              {renderInput("project_location", "Project location", "Enter project location.")}
              {renderSelect("project_type", "Project type", projectTypeOptions)}
              {renderSelect("project_stage", "Project stage", projectStageOptions)}
              {renderInput("timeline", "Timeline", "Enter expected timing, phases, or milestones.")}
              {renderInput("requested_budget", "Requested funding ($)", "Enter requested funding amount.", "number")}
              {renderInput("total_project_cost", "Total project cost ($)", "Enter total project cost, or 0 if unknown.", "number")}
            </div>
            {renderTextarea("project_summary", "Project summary", "Briefly describe what the project will do and what will change.", 3)}
            {renderTextarea("project_objectives", "Project objectives", "List the main objectives the project is trying to achieve.", 3)}
            {renderTextarea("project_activities", "Key activities and deliverables", "List the main activities, deliverables, and workplan steps.", 4)}
            {renderTextarea("expected_outputs", "Expected outputs / deliverables", "List concrete outputs such as reports, installed components, training, plans, records, or other deliverables.", 3)}
            {renderTextarea("staffing_plan", "Staffing/team roles", "Describe who will lead, manage, deliver, and support the project.", 3)}
            {renderTextarea("project_management_approach", "Project management approach", "Describe oversight, milestones, reporting, and coordination approach.", 3)}
            </>
          )}

          {renderSectionCard(
            "engagement",
            "Engagement & Indigenous Principles",
            "Only include Elders, Knowledge Keepers, Youth, OCAP, or cultural safety details if applicable.",
            <>
            <div className="grid gap-4 sm:grid-cols-2">
              {renderSelect("community_support_status", "Community support status", supportStatusOptions)}
              {renderInput("approvals_status", "Approvals/supporting documents status", "Describe BCR, council motion, letters, or To confirm.")}
            </div>
            {renderTextarea("community_engagement", "Community engagement", "Describe consultation, participation, community input, or planned engagement.", 3)}
            {renderTextarea("elders_involvement", "Elders involvement", "Describe Elders involvement, N/A, or To confirm.", 2)}
            {renderTextarea("knowledge_keepers_involvement", "Knowledge Keepers involvement", "Describe Knowledge Keepers involvement, N/A, or To confirm.", 2)}
            {renderTextarea("youth_involvement", "Youth involvement", "Describe Youth involvement, N/A, or To confirm.", 2)}
            {renderTextarea("data_governance", "Data governance / OCAP", "Describe data ownership/control/access/possession approach, N/A, or To confirm.", 3)}
            {renderTextarea("cultural_safety", "Cultural safety considerations", "Describe language, accessibility, protocol, privacy, trauma-informed, or N/A.", 3)}
            </>
          )}

          {renderSectionCard(
            "evidence",
            "Evidence, Outcomes & Measurement",
            "Baseline, need, beneficiaries, indicators, and success measurement.",
            <>
            {renderTextarea("evidence_note", "Evidence or supporting data", "Add local data, incidents, reports, waitlists, quotes, or other evidence.", 3)}
            {renderTextarea("why_now", "Why now", "Explain urgency, timing, opportunity, risk of delay, or funder alignment.", 3)}
            {renderTextarea("target_beneficiaries", "Who benefits", "Name the people, groups, facilities, or services that benefit.", 3)}
            {renderTextarea("direct_beneficiaries", "Direct beneficiaries", "Estimate direct beneficiaries or enter To confirm.", 2)}
            {renderTextarea("indirect_beneficiaries", "Indirect beneficiaries", "Describe indirect beneficiaries or N/A.", 2)}
            {renderTextarea("expected_outcomes", "Expected outcomes", "Describe short- and long-term changes expected.", 3)}
            {renderTextarea("quantitative_indicators", "Quantitative indicators", "List measurable indicators, counts, targets, or To confirm.", 3)}
            {renderTextarea("qualitative_indicators", "Qualitative indicators", "List qualitative indicators such as confidence, safety, satisfaction, or N/A.", 3)}
            {renderTextarea("baseline_conditions", "Baseline conditions", "Describe the current baseline before project implementation.", 3)}
            {renderTextarea("baseline_data_collection", "Baseline data collection", "Describe how baseline data will be collected or To confirm.", 3)}
            {renderTextarea("success_measurement", "Success measurement", "Describe how success will be measured and reported.", 3)}
            </>
          )}

          {renderSectionCard(
            "budget",
            "Budget, Risk & Sustainability",
            "Budget categories, assumptions, funding support, risks, and long-term plan.",
            <>
            <div className="grid gap-4 sm:grid-cols-2">
              {renderSelect("other_funding_status", "Other funding status", fundingStatusOptions)}
              {renderInput("budget_assumptions", "Budget assumptions", "Summarize key assumptions.")}
            </div>
            {renderTextarea("budget_personnel", "Personnel costs", "Describe personnel costs or N/A.", 2)}
            {renderTextarea("budget_professional_services", "Professional services costs", "Describe professional services costs or N/A.", 2)}
            {renderTextarea("budget_equipment_materials", "Equipment/materials costs", "Describe equipment/materials costs or N/A.", 2)}
            {renderTextarea("budget_travel_logistics", "Travel/shipping/logistics costs", "Describe travel/logistics costs or N/A.", 2)}
            {renderTextarea("budget_training", "Training costs", "Describe training costs or N/A.", 2)}
            {renderTextarea("budget_evaluation", "Evaluation/reporting costs", "Describe evaluation/reporting costs or N/A.", 2)}
            {renderTextarea("budget_admin", "Administration/overhead costs", "Describe admin/overhead costs or N/A.", 2)}
            {renderTextarea("budget_contingency", "Contingency costs", "Describe contingency costs or N/A.", 2)}
            {renderTextarea("budget_breakdown", "Budget breakdown", "Summarize the full budget by major category.", 3)}
            {renderTextarea("other_funding", "Other funding or in-kind support", "List confirmed/pending cash or in-kind support.", 3)}
            {renderTextarea("risks_and_mitigation", "Risks and mitigation", "Describe financial, operational, regulatory, environmental, and stakeholder risks with mitigation.", 4)}
            {renderTextarea("risk_likelihood", "Risk likelihood", "Describe likelihood of key risks, using plain language such as low/moderate/high and why.", 2)}
            {renderTextarea("risk_impact", "Risk impact", "Describe what would happen if key risks occur.", 2)}
            {renderTextarea("mitigation_plan", "Mitigation and contingency plan", "Describe concrete mitigation actions, contingency plans, and who will monitor risks.", 3)}
            {renderTextarea("sustainability_plan", "Sustainability after funding", "Explain maintenance, operations, ownership, partnerships, and continuity after funding.", 3)}
            {renderTextarea("maintenance_requirements", "Maintenance requirements", "Describe ongoing maintenance, inspections, staffing, records, parts, or operating requirements.", 3)}
            {renderTextarea("ownership_model", "Community ownership / operations model", "Describe who owns, operates, governs, and remains accountable for the work after funding.", 3)}
            {renderTextarea("future_funding_sources", "Future funding/revenue sources", "Describe future funding/revenue sources, N/A, or To confirm.", 2)}
            {renderTextarea("scaling_plan", "Scaling or replication plan", "Describe scaling/replication opportunities, N/A, or To confirm.", 2)}
            </>
          )}

          {renderSectionCard(
            "supporting",
            "Supporting Documents",
            "Upload local plans, letters, budgets, notes, reports, or paste excerpts that should inform the proposal.",
            <>
            <Input
              id="supporting_documents"
              type="file"
              multiple
              accept=".txt,.md,.csv,.json,.pdf,.docx"
              onChange={handleSupportingDocs}
              disabled={isSubmitting || isParsingSupportingDocs}
            />
            {isParsingSupportingDocs && (
              <p className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                Extracting supporting context...
              </p>
            )}
            {supportingDocNames.length > 0 && (
              <div className="space-y-1 text-sm text-muted-foreground">
                {supportingDocNames.map((name) => (
                  <p key={name} className="flex items-center gap-2">
                    <FileText className="h-4 w-4" />
                    {name}
                  </p>
                ))}
              </div>
            )}
            {supportingDocError && <p className="text-sm text-destructive">{supportingDocError}</p>}
            {renderTextarea("supporting_documents_text", "Extracted or pasted supporting context", "Upload supporting documents above, or paste relevant notes/excerpts here.", 5)}
            </>
          )}

          {error && (
            <div className="flex items-center gap-2 rounded-lg border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive">
              <AlertCircle className="h-4 w-4 shrink-0" />
              {error}
            </div>
          )}

          <div className="flex flex-wrap gap-3">
            <Button type="button" variant="secondary" onClick={loadDemoData} disabled={isSubmitting}>
              Load demo data
            </Button>
            <Button type="button" variant="outline" onClick={onBack} disabled={isSubmitting}>
              Back
            </Button>
            <Button type="submit" disabled={isSubmitting || isParsingSupportingDocs}>
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Generating proposal...
                </>
              ) : (
                "Generate proposal"
              )}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
