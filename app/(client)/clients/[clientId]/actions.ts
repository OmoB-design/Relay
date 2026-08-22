"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import {
  addKpi,
  deleteKpi,
  deleteSensitivity,
  deleteStakeholder,
  saveSensitivity,
  saveStakeholder,
  updateComms,
  updateKpi,
} from "@/lib/data";
import { MetricKeySchema } from "@/lib/types";

/* Profile mutations. Every input is zod-validated server-side before touching
   the DB — the UI validates first, this is the backstop. All actions
   revalidate the workspace route so server components re-render fresh. */

const revalidate = (clientId: string) => revalidatePath(`/clients/${clientId}`);

const KpiInput = z.object({
  clientId: z.string().uuid(),
  kpiId: z.string().uuid(),
  label: z.string().trim().min(1),
  target: z.number().finite(),
  polarity: z.enum(["higher_is_better", "lower_is_better", "on_target"]),
});

export async function updateKpiAction(input: z.infer<typeof KpiInput>) {
  const p = KpiInput.parse(input);
  await updateKpi(p.kpiId, {
    label: p.label,
    target: p.target,
    polarity: p.polarity,
  });
  revalidate(p.clientId);
}

const AddKpiInput = z.object({
  clientId: z.string().uuid(),
  label: z.string().trim().min(1),
  mapsTo: MetricKeySchema,
  target: z.number().finite(),
  polarity: z.enum(["higher_is_better", "lower_is_better", "on_target"]),
  format: z.enum(["currency", "count", "ratio", "percent"]),
});

export async function addKpiAction(input: z.infer<typeof AddKpiInput>) {
  const p = AddKpiInput.parse(input);
  await addKpi(p);
  revalidate(p.clientId);
}

export async function deleteKpiAction(clientId: string, id: string) {
  await deleteKpi(z.string().uuid().parse(id));
  revalidate(clientId);
}

const SensitivityInput = z.object({
  clientId: z.string().uuid(),
  id: z.string().uuid().optional(),
  type: z.enum(["framing", "cadence", "metric-avoidance", "tone"]),
  text: z.string().trim().min(1),
});

export async function saveSensitivityAction(
  input: z.infer<typeof SensitivityInput>,
) {
  const p = SensitivityInput.parse(input);
  await saveSensitivity(p);
  revalidate(p.clientId);
}

export async function deleteSensitivityAction(clientId: string, id: string) {
  await deleteSensitivity(z.string().uuid().parse(id));
  revalidate(clientId);
}

const CommsInput = z.object({
  clientId: z.string().uuid(),
  cadencePrimary: z.enum(["weekly", "weekly-lite", "monthly"]),
  channel: z.enum(["slack", "email"]),
  anchorDay: z
    .enum(["mon", "tue", "wed", "thu", "fri", "sat", "sun"])
    .optional(),
  anchorTime: z
    .string()
    .regex(/^([01]\d|2[0-3]):[0-5]\d$/)
    .optional(),
});

export async function updateCommsAction(input: z.infer<typeof CommsInput>) {
  const p = CommsInput.parse(input);
  await updateComms(p.clientId, {
    cadencePrimary: p.cadencePrimary,
    channel: p.channel,
    anchorDay: p.anchorDay,
    anchorTime: p.anchorTime,
  });
  revalidate(p.clientId);
  // The admin's overview reads this to decide whether a client is late.
  revalidatePath("/overview");
}

const StakeholderInput = z.object({
  clientId: z.string().uuid(),
  id: z.string().uuid().optional(),
  name: z.string().trim().min(1),
  role: z.string().trim().min(1),
  gets: z.enum(["short", "full", "deck"]),
});

export async function saveStakeholderAction(
  input: z.infer<typeof StakeholderInput>,
) {
  const p = StakeholderInput.parse(input);
  await saveStakeholder(p);
  revalidate(p.clientId);
}

export async function deleteStakeholderAction(clientId: string, id: string) {
  await deleteStakeholder(z.string().uuid().parse(id));
  revalidate(clientId);
}
