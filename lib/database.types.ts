/* ============================================================================
   Hand-authored Database type for the typed Supabase client. Mirrors
   supabase/schema.sql (snake_case columns). When a live Supabase project is
   provisioned, this can be regenerated with `supabase gen types typescript`.
   ========================================================================== */

type Json = string | number | boolean | null | { [k: string]: Json } | Json[];

interface Row<T> {
  Row: T;
  Insert: Partial<T>;
  Update: Partial<T>;
  Relationships: [];
}

export interface Database {
  public: {
    Tables: {
      /* People and access (supabase/migrations/0008_auth.sql, 0009_rls.sql). */
      profiles: Row<{
        id: string;
        email: string;
        name: string;
        role: string;
        status: string;
        created_at: string;
        /* Null until they finish /auth/set-password — invited, not yet arrived.
           See 0012_profile_accepted_at.sql for why auth.users cannot answer this. */
        accepted_at: string | null;
      }>;
      client_assignments: Row<{
        client_id: string;
        buyer_id: string;
        assigned_at: string;
      }>;
      clients: Row<{
        id: string;
        name: string;
        currency: string;
        source_of_truth: string;
        cadence: Json;
        channel: string;
        descriptor: string | null;
        /* Nullable for the clients that predate migration 0013; ingestion falls
           back to `name`, which is how it matched them before. */
        tracker_tab: string | null;
        domain: string | null;
        daily_to_client: boolean;
        account_timezone: string;
      }>;
      accounts: Row<{
        id: string;
        client_id: string;
        platform: string;
        external_id: string;
        health: string;
        last_sync_at: string;
      }>;
      kpis: Row<{
        id: string;
        client_id: string;
        label: string;
        maps_to: string;
        target: number;
        polarity: string;
        format: string;
        tolerance_pct: number | null;
        note: string | null;
      }>;
      sensitivities: Row<{
        id: string;
        client_id: string;
        type: string;
        text: string;
      }>;
      stakeholders: Row<{
        id: string;
        client_id: string;
        name: string;
        role: string;
        gets: string;
      }>;
      evidence_snapshots: Row<{
        id: string;
        client_id: string;
        period: Json;
        as_of: string;
      }>;
      evidence_items: Row<{
        snapshot_id: string;
        item_key: string;
        source: string;
        source_of_truth: string | null;
        metric_key: string | null;
        metric_label: string;
        value: number;
        value_display: string;
        delta_pct: number | null;
        delta_label: string;
        polarity: string | null;
        note: string | null;
        series: Json | null;
        segment: string;
        unavailable_reason: string | null;
      }>;
      narratives: Row<{
        id: string;
        client_id: string;
        snapshot_id: string;
        week: Json;
        status: string;
        channel: string;
        email_greeting: string | null;
        whatsapp_variant: string | null;
        reviewed_at: string | null;
        sent_at: string | null;
      }>;
      daily_rows: Row<{
        id: string;
        client_id: string;
        date: string;
        segment: string;
        source: string;
        source_of_truth: string | null;
        spend: number | null;
        sales: number | null;
        revenue: number | null;
        roas: number | null;
        cpa_cpo: number | null;
        nc_roas: number | null;
        ncac: number | null;
        nvp: number | null;
        unavailable: Json;
        status: string;
        edited: boolean;
        override_reason: string | null;
        confirmed_at: string | null;
        confirmed_by: string | null;
        /* Real attester (migration 0015). Null only on rows that predate it. */
        confirmed_by_id: string | null;
        compiled_at: string;
      }>;
      loom_briefs: Row<{
        id: string;
        client_id: string;
        narrative_id: string;
        snapshot_id: string;
        week: Json;
        risk: string;
        win: string;
        created_at: string;
      }>;
      loom_headlines: Row<{
        id: string;
        brief_id: string;
        ord: number;
        text: string;
        evidence_refs: Json;
      }>;
      voice_profiles: Row<{
        id: string;
        buyer_key: string;
        created_at: string;
      }>;
      edit_diffs: Row<{
        id: string;
        profile_id: string;
        narrative_id: string | null;
        client_id: string | null;
        before_text: string;
        after_text: string;
        segments: Json;
        created_at: string;
      }>;
      claims: Row<{
        id: string;
        narrative_id: string;
        ord: number;
        kind: string;
        text: string;
        evidence_refs: Json;
      }>;
      timeline_entries: Row<{
        id: string;
        client_id: string;
        type: string;
        date: string;
        summary: string;
        body: string | null;
        snapshot_id: string | null;
        ref_id: string | null;
      }>;
      flags: Row<{
        id: string;
        client_id: string;
        kind: string;
        metric_label: string;
        delta_label: string;
        headline: string;
        diagnostic: string;
        draft_note: string | null;
        status: string;
        dismissal_reason: string | null;
        created_at: string;
        dedupe_key: string | null;
        metric_key: string | null;
        resolved_at: string | null;
      }>;
      answer_threads: Row<{
        id: string;
        client_id: string;
        question: string;
        created_at: string;
        answer: Json | null;
      }>;
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
}
