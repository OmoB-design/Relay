"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  useTransition,
} from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion, useReducedMotion } from "motion/react";
import { toast } from "sonner";
import { ArrowLeft, MoreHorizontal } from "lucide-react";
import { cn } from "@/lib/utils";
import { config, formatAsOf } from "@/lib/config";
import {
  claimsForItem,
  formatForTone,
  type Tone,
} from "@/lib/narrative";
import type { Claim, EvidenceItem } from "@/lib/types";
import type { NarrativeContext } from "@/lib/data";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { StatusTimeline } from "@/components/relay/StatusMark";
import { SensitivityChip } from "@/components/relay/SensitivityChip";
import { EvidenceCard } from "@/components/relay/EvidenceCard";
import { ClaimSpan } from "@/components/relay/ClaimSpan";
import {
  markReviewedAction,
  saveDraftAction,
  sendNarrativeAction,
  unreviewAction,
} from "@/app/(app)/clients/[clientId]/narratives/[narrativeId]/actions";

/* ============================================================================
   NarrativeSplitView — the flagship (design.md §4.3 + the reference mockup).
   The claim ↔ evidence stitch, both directions; edit-draft textarea swap;
   tone toggle + preview + copy; drafted → reviewed → sent, persisted.
   Mobile: panes stack, evidence arrives as a bottom Sheet on claim tap.
   ========================================================================== */

const sv = config.copy.splitView;

export function NarrativeSplitView({ context }: { context: NarrativeContext }) {
  const { narrative, snapshot, profile, loomBriefId } = context;
  const router = useRouter();
  const reducedMotion = useReducedMotion();
  const [pending, startTransition] = useTransition();

  // --- Stitch state ---
  const [selectedClaimId, setSelectedClaimId] = useState<string | null>(null);
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);
  const cardRefs = useRef<Record<string, HTMLDivElement | null>>({});

  // --- Edit state ---
  const [editing, setEditing] = useState(false);
  const [draftText, setDraftText] = useState("");
  const [editError, setEditError] = useState<string | null>(null);

  // --- Tone / preview ---
  const [tone, setTone] = useState<Tone>(
    narrative.channel === "slack" ? "slack" : "email",
  );
  const [previewOpen, setPreviewOpen] = useState(false);

  // --- Mobile sheet ---
  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia(
      `(max-width: ${config.splitView.mobileBreakpointPx - 1}px)`,
    );
    const update = () => setIsMobile(mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);

  const claims = useMemo(
    () => [...narrative.claims].sort((a, b) => a.order - b.order),
    [narrative.claims],
  );

  const selectedClaim = claims.find((c) => c.id === selectedClaimId);
  const activeItemIds = selectedClaim
    ? selectedClaim.evidenceRefs.map((r) => r.itemId)
    : [];
  const highlightedClaimIds = selectedItemId
    ? claimsForItem(claims, selectedItemId).map((c) => c.id)
    : [];

  const clearSelection = useCallback(() => {
    setSelectedClaimId(null);
    setSelectedItemId(null);
  }, []);

  // Esc clears selection and preview (design.md: Esc/blur clears).
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        clearSelection();
        setPreviewOpen(false);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [clearSelection]);

  // Claim → evidence: scroll the first linked card into view (desktop rail).
  useEffect(() => {
    const first = activeItemIds[0];
    if (first && cardRefs.current[first] && !isMobile) {
      cardRefs.current[first]!.scrollIntoView({
        behavior: reducedMotion ? "auto" : "smooth",
        block: "nearest",
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedClaimId]);

  function selectClaim(id: string) {
    setSelectedItemId(null);
    setSelectedClaimId((cur) => (cur === id ? null : id));
  }

  function selectItem(id: string) {
    setSelectedClaimId(null);
    setSelectedItemId((cur) => (cur === id ? null : id));
  }

  // --- Actions ---

  function startEditing() {
    setDraftText(claims.map((c) => c.text).join("\n\n"));
    setEditError(null);
    setEditing(true);
    clearSelection();
  }

  function saveDraft() {
    const paragraphs = draftText
      .split(/\n\s*\n/)
      .map((p) => p.replace(/\s*\n\s*/g, " ").trim())
      .filter((p) => p.length > 0);
    startTransition(async () => {
      const result = await saveDraftAction({
        clientId: profile.id,
        narrativeId: narrative.id,
        paragraphs,
      });
      if (!result.ok) {
        setEditError(result.error);
        return;
      }
      setEditing(false);
      setEditError(null);
      toast(config.copy.actions.saved);
      router.refresh();
    });
  }

  function onMarkReviewed() {
    startTransition(async () => {
      await markReviewedAction(profile.id, narrative.id);
      toast("Marked reviewed");
      router.refresh();
    });
  }

  function onSend() {
    startTransition(async () => {
      await sendNarrativeAction(profile.id, narrative.id);
      toast(`${sv.sentToastPrefix} ${profile.name}'s timeline`);
      router.refresh();
    });
  }

  function onUnreview() {
    startTransition(async () => {
      await unreviewAction(profile.id, narrative.id);
      toast(sv.backToDraft);
      router.refresh();
    });
  }

  async function copyDraft() {
    const text = formatForTone(tone, narrative, profile.name);
    const toneLabel = config.copy.channelLabel[tone === "email" ? "email" : "slack"];
    try {
      await navigator.clipboard.writeText(text);
      toast(`${sv.copiedToastPrefix} ${toneLabel}`);
    } catch {
      setPreviewOpen(true);
      toast("Copy blocked — select the preview text instead");
    }
  }

  // --- Rendering helpers ---

  const claimDimmed = (c: Claim): boolean =>
    Boolean(
      (selectedClaimId && selectedClaimId !== c.id) ||
        (selectedItemId && !highlightedClaimIds.includes(c.id)),
    );

  const itemState = (item: EvidenceItem) => {
    const linked = activeItemIds.includes(item.id) || selectedItemId === item.id;
    const dimmed =
      (selectedClaimId && !activeItemIds.includes(item.id)) ||
      (selectedItemId && selectedItemId !== item.id);
    return { linked, dimmed: Boolean(dimmed) };
  };

  const groups: { source: string; items: EvidenceItem[] }[] = useMemo(() => {
    const order = ["Google Ads", "Tracker"];
    return order
      .map((source) => ({
        source,
        items: snapshot.items.filter((i) => i.source === source),
      }))
      .filter((g) => g.items.length > 0);
  }, [snapshot.items]);

  const renderRailCard = (item: EvidenceItem) => {
    const { linked, dimmed } = itemState(item);
    return (
      <motion.div
        key={item.id}
        ref={(el) => {
          cardRefs.current[item.id] = el;
        }}
        role="button"
        tabIndex={0}
        aria-pressed={selectedItemId === item.id}
        aria-label={`Evidence: ${item.metricLabel}`}
        onClick={() => selectItem(item.id)}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            selectItem(item.id);
          }
        }}
        animate={{
          y: linked && !reducedMotion ? -config.splitView.settleTranslatePx : 0,
          opacity: dimmed ? config.splitView.dimOpacity : 1,
        }}
        transition={{
          duration: config.motion.base / 1000,
          ease: "easeOut",
        }}
        className="cursor-pointer rounded-lg"
      >
        <EvidenceCard item={item} state={linked ? "linked" : "default"} />
      </motion.div>
    );
  };

  const selectedClaimItems = selectedClaim
    ? snapshot.items.filter((i) => activeItemIds.includes(i.id))
    : [];

  const canEdit = narrative.status === "drafted";

  return (
    <div className="min-h-screen pb-40">
      {/* ── Sticky header ── */}
      <header className="sticky top-0 z-20 border-b border-line bg-paper px-4 py-3 md:px-7">
        <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
          <div className="flex min-w-0 flex-wrap items-baseline gap-x-3 gap-y-1">
            <Link
              href={`/clients/${profile.id}?tab=narratives`}
              className="inline-flex items-center gap-1 font-ui text-13 text-ink-soft hover:text-ink"
            >
              <ArrowLeft size={14} aria-hidden="true" /> Narratives
            </Link>
            <h1 className="font-display text-22 font-semibold text-ink">
              {profile.name}
            </h1>
            <span className="font-ui text-13 text-ink-soft">
              Weekly commentary · {narrative.week.label}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <StatusTimeline narrative={narrative} />
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button size="sm" variant="ghost" aria-label="More actions">
                  <MoreHorizontal size={16} aria-hidden="true" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem asChild>
                  <Link href={`/clients/${profile.id}`}>Open client profile</Link>
                </DropdownMenuItem>
                {loomBriefId && (
                  <DropdownMenuItem asChild>
                    <Link
                      href={`/clients/${profile.id}/narratives/${narrative.id}/loom`}
                    >
                      {config.copy.loom.openBrief}
                    </Link>
                  </DropdownMenuItem>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
        {/* Sensitivities: always visible during review (design.md §4.3). */}
        <div className="mt-2 flex flex-wrap gap-2">
          {profile.sensitivities.map((s) => (
            <SensitivityChip key={s.id} sensitivity={s} />
          ))}
        </div>
      </header>

      {/* ── Split ── */}
      <main className="mx-auto flex max-w-6xl items-stretch">
        {/* Left — draft */}
        <section
          aria-label="Draft"
          onClick={(e) => {
            if (e.target === e.currentTarget) clearSelection();
          }}
          className="w-full px-5 py-8 md:px-9 md:py-10"
          style={!isMobile ? { flex: `0 0 ${config.splitView.paneSplitPct}%` } : undefined}
        >
          <p className="mb-5 font-ui text-12 uppercase tracking-wide text-ink-soft">
            {sv.draftLabel}
          </p>

          {editing ? (
            <div className="flex max-w-2xl flex-col gap-3">
              <Textarea
                value={draftText}
                onChange={(e) => setDraftText(e.target.value)}
                className="min-h-96 bg-surface font-narrative text-16"
                aria-label="Draft text — one paragraph per claim"
              />
              <p className="font-ui text-12 text-ink-soft">
                One paragraph per claim, separated by blank lines. Evidence
                stays attached to each paragraph by position.
              </p>
              {editError && (
                <p className="font-ui text-13 text-negative">{editError}</p>
              )}
              <div className="flex gap-2">
                <Button size="sm" onClick={saveDraft} disabled={pending}>
                  {sv.saveDraft}
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => {
                    setEditing(false);
                    setEditError(null);
                  }}
                >
                  {config.copy.actions.cancel}
                </Button>
              </div>
            </div>
          ) : (
            <>
              <div className="max-w-2xl font-narrative text-18 text-ink">
                {narrative.emailGreeting && (
                  <p className="mb-4">{narrative.emailGreeting}</p>
                )}
                {claims.map((claim) => (
                  <p key={claim.id} className="mb-4">
                    <ClaimSpan
                      claim={claim}
                      selected={selectedClaimId === claim.id}
                      highlighted={highlightedClaimIds.includes(claim.id)}
                      dimmed={claimDimmed(claim)}
                      onSelect={() => selectClaim(claim.id)}
                    />
                  </p>
                ))}
                <p className="text-ink-soft">{sv.signature}</p>
              </div>
              {canEdit && (
                <Button
                  size="sm"
                  variant="outline"
                  className="mt-2"
                  onClick={startEditing}
                >
                  {sv.editDraft}
                </Button>
              )}
            </>
          )}
        </section>

        {/* Divider + right rail (desktop only; mobile uses the Sheet) */}
        <div className="hidden w-px bg-line md:block" aria-hidden="true" />
        <aside
          aria-label="Evidence"
          className="hidden flex-1 bg-surface/50 px-5 py-8 md:block md:py-10"
        >
          <div className="mb-4 flex items-baseline justify-between">
            <p className="font-ui text-12 uppercase tracking-wide text-ink-soft">
              {sv.evidenceLabel}
            </p>
            {(selectedClaimId || selectedItemId) && (
              <button
                type="button"
                onClick={clearSelection}
                className="font-ui text-12 font-medium text-verdigris"
              >
                {sv.clearLabel}
              </button>
            )}
          </div>
          <div className="flex flex-col gap-4">
            {groups.map((group) => (
              <div key={group.source} className="flex flex-col gap-2.5">
                <p className="font-ui text-12 text-ink-soft">{group.source}</p>
                {group.items.map(renderRailCard)}
              </div>
            ))}
          </div>
          <p className="mt-4 font-ui text-12 text-ink-soft">
            as of {formatAsOf(snapshot.asOf)} · Google Ads + Tracker
          </p>
        </aside>
      </main>

      {/* ── Mobile: evidence bottom Sheet on claim tap ── */}
      <Sheet
        open={isMobile && Boolean(selectedClaim)}
        onOpenChange={(open) => {
          if (!open) clearSelection();
        }}
      >
        <SheetContent side="bottom" className="max-h-dialog-cap overflow-y-auto">
          <SheetHeader>
            <SheetTitle className="font-display text-18 text-ink">
              Evidence for this claim
            </SheetTitle>
          </SheetHeader>
          <div className="flex flex-col gap-3 px-4 pb-6">
            {selectedClaimItems.map((item) => (
              <EvidenceCard key={item.id} item={item} state="linked" compact />
            ))}
            <p className="font-ui text-12 text-ink-soft">
              as of {formatAsOf(snapshot.asOf)}
            </p>
          </div>
        </SheetContent>
      </Sheet>

      {/* ── Sticky footer action bar ── */}
      <footer className="fixed inset-x-0 bottom-16 z-30 border-t border-line bg-surface px-4 py-3 shadow-raised md:bottom-0 md:left-56 md:px-7">
        <div className="flex flex-wrap items-center justify-between gap-3">
          {/* Tone toggle + preview */}
          <div className="relative flex items-center gap-2.5">
            <div
              role="group"
              aria-label="Tone"
              className="flex overflow-hidden rounded-md border border-line"
            >
              {(["email", "slack"] as const).map((t) => (
                <button
                  key={t}
                  type="button"
                  aria-pressed={tone === t}
                  onClick={() => {
                    setTone(t);
                    setPreviewOpen(true);
                  }}
                  className={cn(
                    "px-3.5 py-1.5 font-ui text-13 font-medium transition-colors",
                    tone === t
                      ? "bg-ink text-white"
                      : "bg-transparent text-ink-soft hover:text-ink",
                  )}
                >
                  {config.copy.channelLabel[t]}
                </button>
              ))}
            </div>
            <button
              type="button"
              onClick={() => setPreviewOpen((v) => !v)}
              className="font-ui text-12 font-medium text-verdigris"
            >
              {previewOpen ? sv.previewHide : sv.previewShow}
            </button>

            {previewOpen && (
              <div className="absolute bottom-12 left-0 z-40 max-h-72 w-80 overflow-y-auto rounded-lg border border-line bg-surface p-4 shadow-raised sm:w-96">
                <p className="mb-2 font-ui text-12 uppercase tracking-wide text-ink-soft">
                  {tone === "slack" ? "Slack — condensed" : "Email — full"}
                </p>
                <pre
                  className={cn(
                    "whitespace-pre-wrap text-13 text-ink",
                    tone === "slack" ? "font-ui" : "font-narrative",
                  )}
                >
                  {formatForTone(tone, narrative, profile.name)}
                </pre>
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2.5">
            <Button size="sm" variant="outline" onClick={copyDraft}>
              {sv.copy}
            </Button>
            {narrative.status === "drafted" && (
              <Button size="sm" onClick={onMarkReviewed} disabled={pending || editing}>
                {sv.markReviewed}
              </Button>
            )}
            {narrative.status === "reviewed" && (
              <Button
                size="sm"
                variant="ghost"
                onClick={onUnreview}
                disabled={pending}
              >
                {sv.backToDraft}
              </Button>
            )}
            <Button
              size="sm"
              onClick={onSend}
              disabled={narrative.status !== "reviewed" || pending}
              variant={narrative.status === "sent" ? "outline" : "default"}
            >
              {narrative.status === "sent" ? "Sent ✓" : sv.send}
            </Button>
          </div>
        </div>
      </footer>
    </div>
  );
}
