import type { DraftSection } from "@/lib/api";

type ProposalTextInput = {
  grantName?: string;
  communityName?: string;
  region?: string;
  requestedBudget?: number | string | null;
  sections: DraftSection[];
};

export function formatProposalText({
  grantName,
  communityName,
  region,
  requestedBudget,
  sections,
}: ProposalTextInput) {
  const header = [
    grantName?.trim() || "Grant Proposal",
    communityName?.trim() ? `Community: ${communityName.trim()}` : "",
    region?.trim() ? `Region: ${region.trim()}` : "",
    requestedBudget !== null && requestedBudget !== undefined && requestedBudget !== ""
      ? `Requested budget: ${formatBudget(requestedBudget)}`
      : "",
  ].filter(Boolean);

  const sectionText = sections
    .filter((section) => section.body?.trim())
    .map((section) => `${section.title?.trim() || section.key}\n\n${section.body.trim()}`);

  return [...header, ...sectionText].join("\n\n");
}

export async function copyProposalText(text: string) {
  if (!text.trim()) throw new Error("This proposal does not have any text to copy.");

  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(text);
    return;
  }

  const textarea = document.createElement("textarea");
  textarea.value = text;
  textarea.setAttribute("readonly", "");
  textarea.style.position = "fixed";
  textarea.style.opacity = "0";
  document.body.appendChild(textarea);
  textarea.select();
  const copied = document.execCommand("copy");
  textarea.remove();

  if (!copied) throw new Error("The proposal could not be copied. Please try again.");
}

function formatBudget(value: number | string) {
  if (typeof value === "number") {
    return new Intl.NumberFormat("en-CA", {
      style: "currency",
      currency: "CAD",
      maximumFractionDigits: 2,
    }).format(value);
  }
  return String(value).trim();
}
