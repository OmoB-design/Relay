import type { ReactNode } from "react";
import { StatusStepper } from "@/components/relay/StatusStepper";
import { SensitivityChip } from "@/components/relay/SensitivityChip";
import { EvidenceCard } from "@/components/relay/EvidenceCard";
import { EmptyState } from "@/components/relay/EmptyState";
import { FlagCard } from "@/components/relay/FlagCard";
import { Sparkline } from "@/components/relay/Sparkline";
import { Button } from "@/components/ui/button";
import { clientProfiles, flags, snapshots } from "@/lib/seed";

/* Throwaway visual deliverable for Phase 0 (PHASE.md). Renders every token,
   type role, and custom component. Not a product screen. */

const COLOR_TOKENS: { name: string; className: string; role: string }[] = [
  { name: "paper", className: "bg-paper", role: "App background" },
  { name: "surface", className: "bg-surface", role: "Cards, panels" },
  { name: "ink", className: "bg-ink", role: "Primary text" },
  { name: "ink-soft", className: "bg-ink-soft", role: "Secondary text, labels" },
  { name: "line", className: "bg-line", role: "Borders, dividers" },
  { name: "verdigris", className: "bg-verdigris", role: "Evidence, primary, sent" },
  { name: "verdigris-wash", className: "bg-verdigris-wash", role: "Highlight/selected" },
  { name: "flag", className: "bg-flag", role: "Flags, warnings" },
  { name: "flag-wash", className: "bg-flag-wash", role: "Flag card bg" },
  { name: "negative", className: "bg-negative", role: "Negative deltas" },
];

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="flex flex-col gap-4">
      <h2 className="font-ui text-13 uppercase tracking-wide text-ink-soft">
        {title}
      </h2>
      {children}
    </section>
  );
}

export default function StyleguidePage() {
  const northbrook = clientProfiles[0];
  const snap = snapshots[0]; // Northbrook, Jul 6–12
  const cpo = snap.items.find((i) => i.id === "E3")!; // cost per order (good delta)
  const pmax = snap.items.find((i) => i.id === "E1")!; // Performance Max spend (neutral)
  const flagOpen = flags.find((f) => f.id.endsWith("c1"))!; // Birkenstock NCAC anomaly
  const flagFresh = flags.find((f) => f.id.endsWith("c3"))!; // Birkenstock freshness
  const flagDismissed = flags.find((f) => f.id.endsWith("c2"))!; // Switchup dismissed

  return (
    <main className="mx-auto flex max-w-4xl flex-col gap-12 px-6 py-16">
      <header>
        <h1 className="font-display text-36 text-ink">Relay styleguide</h1>
        <p className="mt-2 font-ui text-14 text-ink-soft">
          Phase 0 visual deliverable — tokens, type roles, and custom components.
        </p>
      </header>

      <Section title="Color tokens">
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
          {COLOR_TOKENS.map((t) => (
            <div key={t.name} className="flex items-center gap-3">
              <span
                className={`h-10 w-10 shrink-0 rounded-md border border-line ${t.className}`}
              />
              <span className="min-w-0">
                <span className="block font-ui text-13 text-ink">{t.name}</span>
                <span className="block font-ui text-12 text-ink-soft">
                  {t.role}
                </span>
              </span>
            </div>
          ))}
        </div>
      </Section>

      <Section title="Type roles">
        <div className="flex flex-col gap-4 rounded-lg border border-line bg-surface p-6">
          <div>
            <span className="font-ui text-12 text-ink-soft">
              Display — Fraunces
            </span>
            <p className="font-display text-36 text-ink">Northbrook</p>
            <p className="font-display text-28 text-ink">$26.40</p>
          </div>
          <div>
            <span className="font-ui text-12 text-ink-soft">
              Narrative — Newsreader (draft prose only)
            </span>
            <p className="font-narrative text-18 text-ink">
              Cost per order held at $26.40 — about 9% under our $29 line — even
              with the extra budget, <em>which is the signal we wanted</em>{" "}
              before pushing further.
            </p>
          </div>
          <div>
            <span className="font-ui text-12 text-ink-soft">
              UI — Archivo (all chrome)
            </span>
            <p className="font-ui text-14 text-ink">
              Mark reviewed · Copy for WhatsApp · as of Jul 12, 11:59pm
            </p>
          </div>
        </div>
      </Section>

      <Section title="StatusStepper — drafted / reviewed / sent">
        <div className="flex flex-col gap-4 rounded-lg border border-line bg-surface p-6">
          <StatusStepper status="drafted" />
          <StatusStepper status="reviewed" />
          <StatusStepper status="sent" />
          <div className="pt-2">
            <span className="mb-2 block font-ui text-12 text-ink-soft">
              Compact (Today rows)
            </span>
            <StatusStepper status="reviewed" compact />
          </div>
        </div>
      </Section>

      <Section title="SensitivityChip">
        <div className="flex flex-wrap gap-2 rounded-lg border border-line bg-surface p-6">
          {northbrook.sensitivities.map((s) => (
            <SensitivityChip key={s.id} sensitivity={s} />
          ))}
        </div>
      </Section>

      <Section title="EvidenceCard — default / linked / dimmed">
        <div className="grid gap-4 sm:grid-cols-3">
          <div className="flex flex-col gap-2">
            <span className="font-ui text-12 text-ink-soft">default</span>
            <EvidenceCard item={cpo} state="default" asOf={snap.asOf} />
          </div>
          <div className="flex flex-col gap-2">
            <span className="font-ui text-12 text-ink-soft">
              linked (stitch target)
            </span>
            <EvidenceCard item={cpo} state="linked" asOf={snap.asOf} />
          </div>
          <div className="flex flex-col gap-2">
            <span className="font-ui text-12 text-ink-soft">
              dimmed (another claim selected)
            </span>
            <EvidenceCard item={pmax} state="dimmed" asOf={snap.asOf} />
          </div>
        </div>
      </Section>

      <Section title="Sparkline (hand-drawn SVG, no charting library)">
        <div className="flex items-center gap-6 rounded-lg border border-line bg-surface p-6">
          <Sparkline series={cpo.series ?? []} className="text-verdigris" />
          <Sparkline series={pmax.series ?? []} />
        </div>
      </Section>

      <Section title="FlagCard — open / freshness / dismissed (reason-capture)">
        <div className="flex flex-col gap-4">
          <FlagCard flag={flagOpen} />
          <FlagCard flag={flagFresh} />
          <FlagCard flag={flagDismissed} />
        </div>
      </Section>

      <Section title="EmptyState">
        <EmptyState
          title="No drafts this week yet"
          action={<Button size="sm">Connect a client</Button>}
        >
          Connect a client to see your week take shape.
        </EmptyState>
      </Section>
    </main>
  );
}
