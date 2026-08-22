"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { ArrowLeft, Pencil, ShieldAlert, Sparkle, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { config, formatAsOf } from "@/lib/config";
import { itemsForClaim } from "@/lib/narrative";
import type { LoomBriefContext } from "@/lib/data";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { LoomHeadlineCard } from "@/components/relay/LoomHeadlineCard";
import { updateLoomLineAction } from "@/app/(client)/clients/[clientId]/narratives/[narrativeId]/loom/actions";

/* LoomBriefView (design.md §4.6): the recording-prep page. Single column,
   generous type, NO split view — the buyer already verified this data in the
   narrative review; this is read in the 10 seconds before hitting record.
   Ends with the product declining to reach further: "Relay stops here." */

const lc = config.copy.loom;

/** Heuristic multi-sentence check: terminal punctuation followed by a new
 *  capitalized sentence. Keeps "vs. plan" and "$29." out of the false-positive
 *  zone while catching "Foo happened. Also bar." */
function looksMultiSentence(text: string): boolean {
  return /[.!?]\s+[A-Z]/.test(text.trim());
}

/** One editable one-sentence line (Risk or Win) — the most-spoken words on the
 *  page, so the buyer can put them in their own phrasing before recording. */
function LoomLine({
  field,
  label,
  text,
  icon: Icon,
  washClass,
  toneClass,
  briefId,
  clientId,
  narrativeId,
}: {
  field: "risk" | "win";
  label: string;
  text: string;
  icon: LucideIcon;
  washClass: string;
  toneClass: string;
  briefId: string;
  clientId: string;
  narrativeId: string;
}) {
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(text);
  const [pending, startTransition] = useTransition();

  const empty = value.trim().length === 0;
  const multi = looksMultiSentence(value);
  const valid = !empty && !multi;

  function save() {
    startTransition(async () => {
      await updateLoomLineAction({
        clientId,
        narrativeId,
        briefId,
        field,
        text: value.trim(),
      });
      setEditing(false);
      toast(config.copy.actions.saved);
    });
  }

  return (
    <div className={cn("flex items-start gap-2.5 rounded-lg px-4 py-3", washClass)}>
      <Icon size={16} aria-hidden="true" className={cn("mt-0.5 shrink-0", toneClass)} />
      {editing ? (
        <div className="flex min-w-0 flex-1 flex-col gap-2">
          <Textarea
            value={value}
            onChange={(e) => setValue(e.target.value)}
            aria-label={`${label} line`}
            aria-invalid={!valid}
            className="min-h-16 bg-surface font-ui text-14"
          />
          {empty && (
            <p className="font-ui text-12 text-negative">The line is required.</p>
          )}
          {multi && (
            <p className="font-ui text-12 text-negative">{lc.oneSentenceError}</p>
          )}
          <div className="flex gap-2">
            <Button size="sm" onClick={save} disabled={pending || !valid}>
              {config.copy.actions.save}
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => {
                setValue(text);
                setEditing(false);
              }}
            >
              {config.copy.actions.cancel}
            </Button>
          </div>
        </div>
      ) : (
        <>
          <p className="min-w-0 flex-1 font-ui text-14 text-ink">
            <span className={cn("font-medium", toneClass)}>{label} · </span>
            {text}
          </p>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => {
              setValue(text);
              setEditing(true);
            }}
            aria-label={`Edit ${label.toLowerCase()} line`}
          >
            <Pencil size={14} aria-hidden="true" />
          </Button>
        </>
      )}
    </div>
  );
}

export function LoomBriefView({ context }: { context: LoomBriefContext }) {
  const { brief, snapshot, profile } = context;

  // Teleprompter-style plain text. Interface voice (the stops-here line) is
  // deliberately NOT part of the copied content.
  function briefAsText(): string {
    return [
      `${profile.name} — ${lc.title} — ${brief.week.label}`,
      "",
      ...brief.headlines.map((h, i) => `${i + 1}. ${h.text}`),
      "",
      `${lc.riskLabel}: ${brief.risk}`,
      `${lc.winLabel}: ${brief.win}`,
    ].join("\n");
  }

  async function copyBrief() {
    try {
      await navigator.clipboard.writeText(briefAsText());
      toast(lc.copiedToast);
    } catch {
      toast("Copy blocked — select the text manually");
    }
  }

  return (
    <div className="mx-auto max-w-thread px-5 py-8 md:py-12">
      <header className="mb-8">
        <Link
          href={`/clients/${profile.id}/narratives/${brief.narrativeId}`}
          className="inline-flex items-center gap-1 font-ui text-13 text-ink-soft hover:text-ink"
        >
          <ArrowLeft size={14} aria-hidden="true" /> Weekly commentary
        </Link>
        <h1 className="mt-3 font-display text-28 text-ink">
          {profile.name} — {lc.title}
        </h1>
        <p className="mt-1 font-ui text-14 text-ink-soft">
          {brief.week.label} · {lc.subtitle}
        </p>
      </header>

      {/* The week's three headlines, glance-formatted */}
      <div className="flex flex-col gap-4">
        {brief.headlines.map((h) => (
          <LoomHeadlineCard
            key={h.id}
            headline={h}
            items={itemsForClaim(snapshot, {
              // itemsForClaim resolves refs → items; headlines share the shape
              id: h.id,
              narrativeId: brief.narrativeId,
              order: h.order,
              kind: "fact",
              text: h.text,
              evidenceRefs: h.evidenceRefs,
            })}
            clientId={profile.id}
            narrativeId={brief.narrativeId}
          />
        ))}
      </div>

      {/* One risk, one win — visually distinct, one sentence each, editable */}
      <div className="mt-6 flex flex-col gap-3">
        <LoomLine
          field="risk"
          label={lc.riskLabel}
          text={brief.risk}
          icon={ShieldAlert}
          washClass="bg-flag-wash"
          toneClass="text-flag"
          briefId={brief.id}
          clientId={profile.id}
          narrativeId={brief.narrativeId}
        />
        <LoomLine
          field="win"
          label={lc.winLabel}
          text={brief.win}
          icon={Sparkle}
          washClass="bg-verdigris-wash"
          toneClass="text-verdigris"
          briefId={brief.id}
          clientId={profile.id}
          narrativeId={brief.narrativeId}
        />
      </div>

      {/* Footer: freshness, copy, and the product declining to go further */}
      <footer className="mt-8 flex flex-col gap-4 border-t border-line pt-5">
        <p className="font-ui text-12 text-ink-soft">
          as of {formatAsOf(snapshot.asOf)} GST · Google Ads + Tracker
        </p>
        <div>
          <Button size="sm" variant="outline" onClick={copyBrief}>
            {lc.copyAsText}
          </Button>
        </div>
        <p className="font-ui text-13 text-ink-soft">{lc.stopsHere}</p>
      </footer>
    </div>
  );
}
