import * as React from "react";

/* Memoise for the life of ONE server request.
 *
 *  WHY NOT `import { cache } from "react"` DIRECTLY. lib/supabase.ts and
 *  lib/auth.ts are imported by the CLI scripts in scripts/, which run in plain
 *  Node with no Next.js in the picture. Next aliases `react` to a build that
 *  exports cache(); the standalone react@18.3 package does not. So a top-level
 *  cache(...) call type-checks, builds green, serves pages correctly — and
 *  crashes all 22 verify scripts at import time with "cache is not a function".
 *
 *  Outside a request there is nothing to scope a cache to and only one caller
 *  anyway, so identity is the correct fallback rather than an error.
 *
 *  This is per-REQUEST deduplication, not a cache in the caching sense: nothing
 *  survives the response, nothing is shared between users, and no read can go
 *  stale. It removes duplicate work inside a single render, which is safe in a
 *  way that caching RLS-scoped data across requests would not be. */
type AnyFn = (...args: never[]) => unknown;

const reactCache = (
  React as unknown as { cache?: <T extends AnyFn>(fn: T) => T }
).cache;

export const perRequest: <T extends AnyFn>(fn: T) => T =
  reactCache ?? (<T extends AnyFn>(fn: T): T => fn);
