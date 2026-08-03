"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { format, parseISO } from "date-fns";
import { FileText, MessagesSquare, Search, Video, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { config } from "@/lib/config";
import type {
  LibraryArtifact,
  LibraryArtifactType,
} from "@/lib/data";
import type { EvidenceSnapshot } from "@/lib/types";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { EmptyState } from "@/components/relay/EmptyState";
import { TokenSelect } from "@/components/relay/TokenSelect";
import { SnapshotButton } from "@/components/relay/SnapshotButton";

/* Library (design.md §4.5): filter row (client / type / date range) + result
   list. Row → read-only artifact view with "View data snapshot". Search
   filters on artifact text. Calm, dense, fast. */

const lib = config.copy.library;

const TYPE_ICON: Record<LibraryArtifactType, LucideIcon> = {
  commentary: FileText,
  answer: MessagesSquare,
  loom_brief: Video,
};

function ArtifactDialog({
  artifact,
  snapshot,
  onClose,
}: {
  artifact: LibraryArtifact;
  snapshot?: EvidenceSnapshot;
  onClose: () => void;
}) {
  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-h-dialog-cap overflow-y-auto sm:max-w-xl">
        <DialogHeader>
          <DialogTitle className="font-display text-22 text-ink">
            {artifact.title}
          </DialogTitle>
        </DialogHeader>
        <p className="font-ui text-12 text-ink-soft">
          {artifact.clientName} · {config.copy.artifactTypeLabel[artifact.type]}{" "}
          · {format(parseISO(artifact.date), "EEE, MMM d, yyyy")}
        </p>
        {/* Read-only artifact body — prose in the narrative face. */}
        <div className="whitespace-pre-line font-narrative text-16 text-ink">
          {artifact.body}
        </div>
        <div className="flex flex-wrap gap-2">
          {snapshot && <SnapshotButton snapshot={snapshot} />}
          <Button asChild size="sm" variant="ghost">
            <Link href={artifact.href}>{lib.openLive} →</Link>
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export function LibraryBrowser({
  artifacts,
  clients,
  snapshots,
}: {
  artifacts: LibraryArtifact[];
  clients: { id: string; name: string }[];
  snapshots: Record<string, EvidenceSnapshot>;
}) {
  const [query, setQuery] = useState("");
  const [clientId, setClientId] = useState("");
  const [type, setType] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [openId, setOpenId] = useState<string | null>(null);

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    return artifacts.filter((a) => {
      if (clientId && a.clientId !== clientId) return false;
      if (type && a.type !== type) return false;
      if (from && a.date < from) return false;
      if (to && a.date > to) return false;
      if (q && !(a.title + " " + a.body).toLowerCase().includes(q)) return false;
      return true;
    });
  }, [artifacts, query, clientId, type, from, to]);

  const open = results.find((a) => a.id === openId) ?? null;

  return (
    <div className="mx-auto max-w-4xl px-6 py-10">
      <h1 className="mb-5 font-display text-28 text-ink">{lib.title}</h1>

      {/* Filter row */}
      <div className="mb-5 flex flex-col gap-3">
        <div className="relative">
          <Search
            size={16}
            aria-hidden="true"
            className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-soft"
          />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={lib.searchPlaceholder}
            aria-label="Search artifacts"
            className="pl-9"
          />
        </div>
        <div className="flex flex-wrap gap-2">
          <TokenSelect
            aria-label="Filter by client"
            value={clientId}
            onChange={(e) => setClientId(e.target.value)}
          >
            <option value="">{lib.allClients}</option>
            {clients.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </TokenSelect>
          <TokenSelect
            aria-label="Filter by type"
            value={type}
            onChange={(e) => setType(e.target.value)}
          >
            <option value="">{lib.allTypes}</option>
            {(
              Object.keys(config.copy.artifactTypeLabel) as LibraryArtifactType[]
            ).map((t) => (
              <option key={t} value={t}>
                {config.copy.artifactTypeLabel[t]}
              </option>
            ))}
          </TokenSelect>
          <Input
            type="date"
            aria-label="From date"
            value={from}
            onChange={(e) => setFrom(e.target.value)}
            className="w-auto"
          />
          <Input
            type="date"
            aria-label="To date"
            value={to}
            onChange={(e) => setTo(e.target.value)}
            className="w-auto"
          />
        </div>
      </div>

      {/* Results */}
      {artifacts.length === 0 ? (
        <EmptyState title={lib.empty}>{lib.emptyBody}</EmptyState>
      ) : results.length === 0 ? (
        <EmptyState title={lib.noResults}>{lib.noResultsBody}</EmptyState>
      ) : (
        <ul className="divide-y divide-line overflow-hidden rounded-lg border border-line bg-surface">
          {results.map((a) => {
            const Icon = TYPE_ICON[a.type];
            return (
              <li key={`${a.type}-${a.id}`}>
                <button
                  type="button"
                  onClick={() => setOpenId(a.id)}
                  className="flex w-full items-start gap-3 px-4 py-3 text-left hover:bg-paper"
                >
                  <Icon size={16} aria-hidden="true" className="mt-1 shrink-0 text-ink-soft" />
                  <span className="min-w-0 flex-1">
                    <span className="flex flex-wrap items-baseline gap-x-2">
                      <span className="font-display text-16 text-ink">
                        {a.clientName}
                      </span>
                      <span className="font-ui text-12 text-ink-soft">
                        {config.copy.artifactTypeLabel[a.type]} ·{" "}
                        {format(parseISO(a.date), "MMM d, yyyy")}
                      </span>
                      {/* Lifecycle chip — drafts live here too, never ambiguously. */}
                      {a.status && (
                        <span
                          className={cn(
                            "inline-flex items-center rounded-full px-2 py-0.5 font-ui text-12",
                            a.status === "sent"
                              ? "bg-verdigris-wash text-verdigris"
                              : "border border-line bg-paper text-ink-soft",
                          )}
                        >
                          {config.copy.status[a.status]}
                        </span>
                      )}
                    </span>
                    <span className="mt-0.5 block truncate font-ui text-13 text-ink-soft">
                      {a.firstLine}
                    </span>
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      )}

      {open && (
        <ArtifactDialog
          artifact={open}
          snapshot={open.snapshotId ? snapshots[open.snapshotId] : undefined}
          onClose={() => setOpenId(null)}
        />
      )}
    </div>
  );
}
