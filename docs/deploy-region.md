# Where Relay runs, and why it is pinned

`vercel.json` sets `"regions": ["dub1"]` — Dublin. That single line matters more
to how fast Relay feels than any code change measured so far, and it is easy to
lose in a settings page, so the reasoning lives here.

## The measurement it comes from

Every Supabase call from the app server costs one network round trip, and the
round trip dominates completely. Measured against this project:

| call | median |
| --- | --- |
| network floor (connect) | 132ms |
| `auth.getUser()` | 176ms |
| `profiles` select by primary key | 174ms |
| `daily_rows`, 200 rows | 200ms |

A primary-key lookup and a 200-row scan cost the same. Postgres is doing ~25ms
of work; everything else is travel. So page time is **not** "how much data" —
it is **how many round trips × the distance to Ireland**.

That also means the usual advice does not apply here. Indexes shave single-digit
milliseconds off a 175ms trip. There is no connection pool to tune: the app
speaks to PostgREST over HTTPS, not Postgres over TCP.

## The two regions

- **Supabase project `Relay` (`tmgsnalxtkiggvcxtofy`): `eu-west-1`** — AWS
  Ireland. Confirmed via `supabase projects list`.
- **Vercel: Dublin (`dub1`)**, pinned by the line above.

Vercel's default for a new project is `iad1`, Washington D.C. Deploying without
this line would put every function invocation on a transatlantic hop to Ireland
and back — roughly 70–80ms per round trip, several times per page render, for
no reason at all. `dub1` and `eu-west-1` are the same city.

## What this does NOT fix

Local development still pays the full distance from wherever you are sitting to
Ireland — ~130ms per trip from Lagos. A slow-feeling `npm run dev` is mostly
that, and it is not what users will experience. Measure production before
optimising anything else.

It is also why `auth.getUser()` being called twice per navigation (once in
middleware, once in the layout) is not worth replacing with local JWT
verification: two extra trips at ~2ms each inside the same datacentre is
nothing. That change would have been worth ~350ms locally and is worth ~4ms in
production. Do not be fooled by the local number.

## If Supabase ever moves

Change both together. A Vercel region pinned to a datacentre the database is no
longer in is worse than no pin, because it looks deliberate.
