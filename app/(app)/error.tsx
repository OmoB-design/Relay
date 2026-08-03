"use client";

import { useEffect } from "react";
import Link from "next/link";
import { RotateCw } from "lucide-react";
import { Button } from "@/components/ui/button";

/* Error boundary for every screen in the app shell.
   Copy follows the UI writing rules: say what happened and what to do next.
   No apology, no vagueness, and no pretending the data is fine — a screen that
   silently renders nothing is worse than one that admits it failed. */

export default function AppError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Surfaced in the server log / hosting platform for diagnosis.
    console.error("Relay screen failed:", error);
  }, [error]);

  const isConfig =
    error.message.includes("Supabase env not set") ||
    error.message.includes("Live tracker not configured");

  return (
    <div className="mx-auto max-w-column px-6 py-16">
      <div className="flex flex-col gap-4 rounded-lg border border-line bg-surface p-6">
        <h1 className="font-display text-22 text-ink">
          {isConfig
            ? "Relay isn't configured yet"
            : "This screen couldn't load its data"}
        </h1>

        <p className="font-ui text-14 text-ink-soft">
          {isConfig
            ? "A required connection is missing, so there's nothing to read. Check the values in .env.local, then reload."
            : "Relay reached the app but not the data behind it. Nothing was changed. Try again — if it keeps failing, the database or the tracker connection is the place to look."}
        </p>

        {/* The real message, not a sanitised one: a buyer forwarding this to a
            developer should be forwarding something useful. */}
        <pre className="overflow-x-auto whitespace-pre-wrap rounded-md bg-paper p-3 font-ui text-12 text-ink-soft">
          {error.message}
          {error.digest ? `\n\nref: ${error.digest}` : ""}
        </pre>

        <div className="flex flex-wrap gap-2">
          <Button size="sm" onClick={reset}>
            <RotateCw size={14} aria-hidden="true" /> Try again
          </Button>
          <Button asChild size="sm" variant="ghost">
            <Link href="/today">Back to Today</Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
