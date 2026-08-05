"use client";

import { useEffect, useState, type ChangeEvent, type KeyboardEvent, type ReactNode } from "react";
import Link from "next/link";
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
  community_name: z.string(),
  region: z.string(),
  local_priority: requiredText("Local priority"),
  legal_name: z.string(),
  operating_name: z.string(),
  applicant_type: z.string(),
  applicant_profile: z.string(),
  registration_number: z.string(),
  year_established: z.string(),
  contact_name: z.string(),
  contact_title: z.string(),
  contact_email: z.string(),
  contact_phone: z.string(),
  mailing_address: z.string(),
  website: z.string(),
  indigenous_communities: z.string(),
  population_served: z.string(),
  demographic_context: z.string(),
  existing_services: z.string(),
  service_gaps: z.string(),
  remoteness_context: z.string(),
  governance_context: z.string(),
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
  strengths: z.string(),
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
  data_governance: z.string(),
  cultural_safety: z.string(),
  evidence_note: requiredText("Evidence or supporting data"),
  why_now: requiredText("Why now"),
  requested_budget: z.coerce.number().min(10000, "Requested funding must be at least $10,000").max(5_000_000),
  total_project_cost: z.coerce.number().min(0, "Total project cost cannot be negative").max(50_000_000),
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

export const COMMUNITY_PROFILE_FIELD_KEYS: Array<keyof CommunityFormValues> = [
  "community_name",
  "region",
  "legal_name",
  "operating_name",
  "applicant_type",
  "applicant_profile",
  "registration_number",
  "year_established",
  "contact_name",
  "contact_title",
  "contact_email",
  "contact_phone",
  "mailing_address",
  "website",
  "indigenous_communities",
  "population_served",
  "demographic_context",
  "existing_services",
  "service_gaps",
  "remoteness_context",
  "governance_context",
  "strengths",
  "data_governance",
  "cultural_safety",
];

const selectClassName =
  "flex h-12 w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2";

export const blankCommunityFormValues: CommunityFormValues = {
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
  local_priority:
    "Illustrative application priority: improve reliable year-round access to clean drinking water by addressing high-risk infrastructure, repair delays, and local maintenance capacity. Confirm that this matches the applicant's approved priorities.",
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
  project_title: "Community Water System Reliability Project (Example)",
  project_type: "Community infrastructure",
  project_stage: "Planning and design underway",
  project_location: "Applicant community and surrounding service area",
  timeline: "Months 1-2: technical assessment and design; months 3-5: procurement; months 6-9: installation and training; months 10-12: monitoring and final reporting.",
  project_summary:
    "Replace priority water-system components, improve preventive maintenance, and train local operators to reduce avoidable service interruptions. This is illustrative project information and must be replaced or verified before use.",
  project_objectives:
    "1) Replace the highest-risk components identified through a technical assessment; 2) reduce avoidable service interruptions; 3) train at least four operators; and 4) establish a documented preventive-maintenance and monitoring process.",
  project_activities:
    "Complete a technical assessment; confirm the replacement scope; obtain approvals; procure and ship components; install and commission upgrades; deliver operator training; update maintenance procedures; and monitor performance for three months.",
  expected_outputs:
    "One technical assessment, one approved design and procurement package, installed priority components, training for at least four operators, updated maintenance procedures, three months of monitoring records, and one final report.",
  staffing_plan:
    "The applicant's project lead will manage scope, schedule, procurement, and reporting. Public works staff will support site access and implementation. A qualified engineering advisor will approve design and commissioning. Local operators will complete training and maintain project records.",
  project_management_approach:
    "The project lead will maintain a milestone schedule, decision log, procurement tracker, risk register, and monthly budget report. Leadership will approve scope or budget changes, and the technical advisor will sign off before procurement and after commissioning.",
  challenges:
    "Illustrative need to verify: aging components and delayed access to replacement parts have contributed to service interruptions. Remote shipping windows, limited spare-parts inventory, and a small operator team increase repair time and delivery risk.",
  strengths:
    "Strong local leadership, an experienced public works team, and active resident participation in planning sessions increase project readiness.",
  partners:
    "Applicant leadership: approvals and oversight; public works team: site coordination, installation support, and maintenance; engineering advisor: assessment, design review, and commissioning; supplier/installer: equipment delivery and installation. Confirm names and commitments before submission.",
  target_beneficiaries:
    "Residents, Elders, families, local operators, and community facilities that depend on reliable water service.",
  direct_beneficiaries:
    "Illustrative estimate: 1,200 residents and five community facilities. Replace these figures with the applicant's verified service-population and facility records.",
  indirect_beneficiaries:
    "Visitors, visiting service providers, and organizations whose programming depends on reliable community facilities; quantify these groups only if reliable records are available.",
  expected_outcomes:
    "Short term: priority components are commissioned, operators can use the new procedures, and preventive-maintenance records are complete. Medium term: avoidable interruptions and repair response time improve against the verified baseline. Long term: maintenance evidence supports more reliable service and better capital planning.",
  quantitative_indicators:
    "Illustrative targets: install 100% of approved priority components; train at least four operators; complete at least 90% of scheduled preventive-maintenance checks; and reduce average repair response time by 20% from the verified baseline.",
  qualitative_indicators:
    "Operator confidence using the new procedures, staff assessment of equipment reliability, and facility feedback about service consistency and communication. Collect these through a short pre/post operator questionnaire, a commissioning debrief, and structured facility check-ins.",
  baseline_conditions:
    "Illustrative baseline only: the example 12-month maintenance summary records 12 interruptions totaling 46 service hours, an 18-hour average repair response time, 58% completion of scheduled preventive-maintenance checks, and two operators with current training. Replace every figure with verified applicant records.",
  baseline_data_collection:
    "The project lead will compile dated work orders, maintenance logs, incident records, parts inventories, and training records using a consistent baseline template before installation begins.",
  success_measurement:
    "Compare verified baseline records with three- and six-month monitoring results. Report completed installations, interruptions, response time, preventive-maintenance completion, training attendance, operator feedback, and technical commissioning findings.",
  community_support_status: "Engagement planned",
  community_engagement:
    "Example engagement plan: present the proposed scope through the applicant's normal public meeting process, provide plain-language updates, and invite feedback from operators, Elders, facility representatives, and residents before finalizing implementation details.",
  approvals_status:
    "To confirm: obtain the applicant's formal approval and attach the required motion, resolution, or letter before submission.",
  elders_involvement:
    "Elders will be invited through locally appropriate channels to comment on service impacts, communication needs, and implementation timing; participation and honoraria must be confirmed locally.",
  knowledge_keepers_involvement:
    "Knowledge Keepers or long-term residents will be invited, where appropriate, to share observations about seasonal conditions and community priorities. The applicant will confirm whether this involvement is relevant and how knowledge may be used.",
  youth_involvement:
    "Youth-serving organizations will be offered an age-appropriate opportunity to comment on impacts to learning, recreation, and community facilities; the applicant will confirm whether direct youth engagement is appropriate.",
  data_governance:
    "Community-held records and feedback will be used with local approval and reported in aggregate to respect community control over information.",
  cultural_safety:
    "Engagement will use plain language, respect local decision-making processes, and avoid collecting unnecessary personal information.",
  evidence_note:
    "Illustrative evidence only: an example 12-month maintenance-log summary records 12 interruptions totaling 46 service hours, three urgent replacement-part shipments, an 18-hour average repair response time, and 58% completion of scheduled maintenance checks. Replace these figures and cite verified logs, work orders, technical assessments, photographs, facility feedback, and applicable advisories.",
  why_now:
    "The work should proceed now if verified maintenance records show increasing failure risk and procurement must begin before the next shipping or construction window. Delay could increase emergency repair costs or postpone installation by a full delivery cycle. Confirm these conditions and connect them to the funder's current objectives before submission.",
  requested_budget: 350000,
  total_project_cost: 390000,
  budget_personnel: "$60,000 — project management, local implementation support, record keeping, and reporting.",
  budget_professional_services: "$55,000 — technical assessment, engineering/design review, procurement specifications, and commissioning.",
  budget_equipment_materials: "$160,000 — priority components, replacement parts, controls, installation materials, and initial spare-parts inventory.",
  budget_travel_logistics: "$45,000 — freight, shipping, technical travel, accommodation, and local transportation.",
  budget_training: "$15,000 — operator training, practical exercises, and maintenance documentation.",
  budget_evaluation: "$10,000 — baseline compilation, monitoring, analysis, and final reporting.",
  budget_admin: "$15,000 — financial administration, procurement support, and funder reporting.",
  budget_contingency: "$30,000 — approximately 7.7% for documented price, freight, or installation risks, subject to funder eligibility.",
  budget_breakdown:
    "Total illustrative project cost: $390,000. Personnel $60,000; professional services $55,000; equipment/materials $160,000; travel/logistics $45,000; training $15,000; evaluation $10,000; administration $15,000; contingency $30,000. Requested grant: $350,000; applicant in-kind contribution: $40,000. Replace all figures with quotes and eligible-cost calculations.",
  budget_assumptions:
    "Illustrative assumptions: supplier estimates remain valid through procurement; eligible taxes and freight are included; applicant staff provide $40,000 of documented in-kind time; contingency requires approval and may only cover eligible unforeseen costs. Verify all assumptions against the funder's rules.",
  other_funding_status: "In-kind support confirmed",
  other_funding:
    "$40,000 illustrative applicant in-kind contribution for project oversight, local implementation support, meeting coordination, and reporting. Confirm valuation method and funder eligibility.",
  risks_and_mitigation:
    "Financial risks include price escalation and ineligible costs; operational risks include procurement delays, staff availability, and incompatible components; regulatory risks include delayed permits or approvals; environmental risks include weather and restricted installation windows; stakeholder risks include unclear expectations or insufficient notice about temporary service impacts. Controls include eligibility review, early specifications and approvals, technical sign-off, schedule and budget buffers, a communication plan, and monthly risk review.",
  risk_likelihood:
    "Illustrative rating: procurement/freight delay—medium because delivery options are limited; price escalation—medium until quotes are secured; approval delay—low to medium depending on local requirements; weather-related installation delay—medium; technical incompatibility—low after engineering review; staff-capacity pressure—medium during installation and reporting.",
  risk_impact:
    "Potential impacts include missed installation windows, cost increases, delayed commissioning, temporary service interruption, or added workload for local staff. Confirm the rating and impact of each risk during planning.",
  mitigation_plan:
    "The project lead will own the risk register and review it monthly with applicant leadership. Complete technical specifications and eligibility checks before procurement; obtain multiple quotes where feasible; confirm compatibility before ordering; secure required approvals; identify alternate freight and installation dates; notify affected facilities before service impacts; escalate high risks to leadership; and obtain approval before using contingency funds.",
  sustainability_plan:
    "The applicant will assign trained operators, incorporate inspection tasks into routine work plans, maintain a spare-parts register, retain technical documents, and include future maintenance and replacement costs in annual capital planning.",
  maintenance_requirements:
    "Ongoing requirements include monthly operator checks, scheduled preventive maintenance, an updated spare-parts inventory, annual technical review of critical components, incident documentation, and refresher training when staff roles change.",
  ownership_model:
    "The applicant will own the funded assets and remain accountable for operations, records, maintenance, and replacement decisions. Public works staff will complete day-to-day procedures, with leadership receiving scheduled performance and budget updates.",
  future_funding_sources:
    "Future costs will be considered through the applicant's annual operating and capital planning. Additional eligible infrastructure programs may be pursued for later phases, but no unconfirmed funding should be presented as committed.",
  scaling_plan:
    "The assessment template, procurement specifications, operator checklist, risk register, and monitoring framework can be reused for later infrastructure work after adapting them to each asset and funding program.",
  supporting_documents_text:
    "ILLUSTRATIVE EXAMPLE — NOT A SOURCE DOCUMENT. Example maintenance summary for demonstrating a strong input: 12 interruptions totaling 46 service hours in the prior 12 months; three urgent replacement-part shipments; 18-hour average repair response time; 58% completion of scheduled preventive-maintenance checks; and two operators with current training. Example planning notes identify aging components, limited spare-parts inventory, freight delays, and incomplete maintenance documentation as contributing factors. Before submission, replace every example figure and statement with verified excerpts from the applicant's technical assessment, dated maintenance and incident logs, approved meeting records, supplier estimates, engagement summary, letters of support, and funder guidance.",
};

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
  initialValues,
  onValuesChange,
  saveStatus = "idle",
  communityProfileUpdatedAt,
}: {
  onSubmit: (values: CommunityProfile & { requested_budget: number }) => void;
  isSubmitting: boolean;
  error?: string;
  onBack: () => void;
  initialValues?: CommunityFormValues | null;
  onValuesChange?: (values: CommunityFormValues) => void;
  saveStatus?: "idle" | "unsaved" | "saving" | "saved" | "error";
  communityProfileUpdatedAt?: string | null;
}) {
  const [supportingDocNames, setSupportingDocNames] = useState<string[]>([]);
  const [supportingDocError, setSupportingDocError] = useState("");
  const [isParsingSupportingDocs, setIsParsingSupportingDocs] = useState(false);
  const [demoBackup, setDemoBackup] = useState<CommunityFormValues | null>(null);
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
    watch,
    formState: { errors },
  } = useForm<CommunityFormValues>({
    resolver: zodResolver(schema),
    defaultValues: initialValues || blankCommunityFormValues,
  });

  useEffect(() => {
    if (!onValuesChange) return;
    const subscription = watch((values) => onValuesChange(values as CommunityFormValues));
    return () => subscription.unsubscribe();
  }, [onValuesChange, watch]);

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
      <Input
        id={name}
        type={type}
        {...register(name)}
        placeholder={placeholder}
        {...(type === "number"
          ? {
              min: name === "requested_budget" ? 10000 : 0,
              step: "0.01",
              inputMode: "decimal" as const,
              onKeyDown: (event: KeyboardEvent<HTMLInputElement>) => {
                if (event.key === "-") event.preventDefault();
              },
            }
          : {})}
      />
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
    if (!window.confirm("Fill the application fields with example data? Your saved Community Profile will not be changed.")) return;
    const currentValues = watch() as CommunityFormValues;
    setDemoBackup(currentValues);
    const nextValues = { ...currentValues };
    const reusableFields = new Set<string>(COMMUNITY_PROFILE_FIELD_KEYS);
    (Object.keys(demoValues) as Array<keyof CommunityFormValues>).forEach((field) => {
      if (reusableFields.has(field)) return;
      (nextValues as unknown as Record<string, unknown>)[field] =
        (demoValues as unknown as Record<string, unknown>)[field];
    });
    const communityLabel = currentValues.community_name.trim() || currentValues.legal_name.trim();
    const regionLabel = currentValues.region.trim();
    nextValues.project_title = `${communityLabel || "Community"} Water System Reliability Project (Example)`;
    nextValues.project_location = [communityLabel || "Applicant community", regionLabel].filter(Boolean).join(", ");
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
    reset(nextValues);
  };

  const clearDemoData = () => {
    if (!demoBackup) return;
    reset(demoBackup);
    setDemoBackup(null);
    setSupportingDocNames([]);
    setSupportingDocError("");
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
        <CardTitle>Application-specific information</CardTitle>
        <CardDescription>
          Your saved Community Profile supplies reusable context. Complete only the project and application details below, using N/A or To confirm where needed.
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
          <div className="rounded-lg border border-primary/25 bg-primary/5 p-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="font-medium text-foreground">
                  Community Profile: {initialValues?.community_name || initialValues?.legal_name || "Not completed"}
                </p>
                <p className="mt-1 text-sm text-muted-foreground">
                  Saved applicant and community details will be included in this proposal snapshot.
                  {(initialValues?.community_name || initialValues?.legal_name) && communityProfileUpdatedAt
                    ? ` Last updated ${new Date(communityProfileUpdatedAt).toLocaleDateString()}.`
                    : ""}
                </p>
              </div>
              <Link href="/account" target="_blank">
                <Button type="button" variant="outline">Review Community Profile</Button>
              </Link>
            </div>
          </div>

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
            {renderTextarea("local_priority", "Application priority", "Describe the priority this project addresses and why it matters for this application.", 3)}
            {renderTextarea("challenges", "Project-specific challenges", "Include specific examples of the challenges this project will address.", 3)}
            {renderTextarea("partners", "Project partners", "List partner organizations and each partner's role. Enter N/A if none.", 3)}
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
            <Button type="button" variant="secondary" onClick={loadDemoData} disabled={isSubmitting || Boolean(demoBackup)}>
              Fill form with example data
            </Button>
            {demoBackup && (
              <Button type="button" variant="outline" onClick={clearDemoData} disabled={isSubmitting}>
                Restore my previous entries
              </Button>
            )}
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
            {saveStatus !== "idle" && (
              <p
                className={`self-center text-sm ${saveStatus === "error" ? "text-destructive" : "text-muted-foreground"}`}
                role="status"
              >
                {saveStatus === "unsaved" && "Unsaved changes..."}
                {saveStatus === "saving" && "Saving draft..."}
                {saveStatus === "saved" && "Draft saved"}
                {saveStatus === "error" && "Draft could not be saved. Your entries remain in this form."}
              </p>
            )}
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
