"use client";

import { useEffect, useRef, useState } from "react";
import { ExternalLink, HelpCircle, Mail, X } from "lucide-react";
import { Button } from "@/components/ui/button";

const FCI_EMAIL = "eryn.stewart@uwaterloo.ca";
const FCI_WEBSITE = "https://uwaterloo.ca/future-cities-institute";

export function ContactFci() {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen) return;

    const closeOnOutsideClick = (event: MouseEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) setIsOpen(false);
    };
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setIsOpen(false);
    };

    document.addEventListener("mousedown", closeOnOutsideClick);
    document.addEventListener("keydown", closeOnEscape);
    return () => {
      document.removeEventListener("mousedown", closeOnOutsideClick);
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, [isOpen]);

  return (
    <div ref={containerRef} className="relative">
      <Button
        type="button"
        variant="outline"
        size="sm"
        aria-expanded={isOpen}
        aria-haspopup="dialog"
        onClick={() => setIsOpen((current) => !current)}
      >
        <HelpCircle className="mr-2 h-4 w-4" />
        Contact FCI
      </Button>

      {isOpen && (
        <div
          role="dialog"
          aria-label="Contact Future Cities Institute"
          className="absolute right-0 top-full z-50 mt-2 w-[min(22rem,calc(100vw-2rem))] rounded-xl border border-border bg-card p-4 text-left shadow-xl"
        >
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="font-semibold text-foreground">Contact Future Cities Institute</p>
              <p className="mt-1 text-sm text-muted-foreground">Eryn Stewart, Founder</p>
            </div>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-8 w-8 shrink-0"
              aria-label="Close contact information"
              onClick={() => setIsOpen(false)}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>

          <div className="mt-4 space-y-2">
            <a
              href={`mailto:${FCI_EMAIL}`}
              className="flex items-center gap-3 rounded-lg border border-border px-3 py-2 text-sm text-foreground transition-colors hover:bg-muted/60"
            >
              <Mail className="h-4 w-4 shrink-0 text-primary" />
              <span className="min-w-0 break-all">{FCI_EMAIL}</span>
            </a>
            <a
              href={FCI_WEBSITE}
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-3 rounded-lg border border-border px-3 py-2 text-sm text-foreground transition-colors hover:bg-muted/60"
            >
              <ExternalLink className="h-4 w-4 shrink-0 text-primary" />
              <span>Future Cities Institute website</span>
            </a>
          </div>
        </div>
      )}
    </div>
  );
}
