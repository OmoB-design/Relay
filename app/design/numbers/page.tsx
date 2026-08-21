import { CatalogueHeader, Group, Spec } from "@/app/design/_ui";
import { MetricCard } from "@/components/relay/NumbersTab";
import { EmptyState } from "@/components/relay/EmptyState";

/* ============================================================================
   Numbers — the metric card in every state it can reach.

   The card is derived, not styled: value + target + polarity decide the
   target line's colour, the series' drift against polarity decides the
   sparkline's tone (green improving, red worsening, grey flat or unjudged),
   and the target rides INSIDE the sparkline's domain as the dashed guide.
   Slugs quote as `numbers/<state>` in Figma.
   ========================================================================== */

/** Deterministic series fixtures — fixed dates so the page renders the same
 *  specimen every visit. */
const DAYS = Array.from({ length: 14 }, (_, i) => {
  const d = String(i + 1).padStart(2, "0");
  return `2026-08-${d}`;
});
const series = (values: number[]) =>
  values.map((value, i) => ({ date: DAYS[i]!, value }));

const RISING = series([
  2.4, 2.5, 2.45, 2.6, 2.7, 2.65, 2.8, 2.9, 2.85, 3.0, 3.1, 3.05, 3.2, 3.3,
]);
const FALLING = series([
  3.3, 3.2, 3.25, 3.1, 3.0, 3.05, 2.9, 2.8, 2.85, 2.7, 2.6, 2.65, 2.5, 2.4,
]);
const RISING_MONEY = series([
  38, 40, 39, 42, 44, 43, 46, 48, 47, 50, 52, 51, 54, 56,
]);
const FALLING_MONEY = series([
  56, 54, 55, 52, 50, 51, 48, 46, 47, 44, 42, 43, 40, 38,
]);
const FLAT = series([
  50, 50.4, 49.8, 50.2, 50.1, 49.9, 50.3, 50, 50.2, 49.8, 50.1, 50, 50.2, 50.1,
]);

export default function NumbersCataloguePage() {
  return (
    <div className="flex flex-col gap-8">
      <CatalogueHeader title="Numbers" count="11 specimens">
        The client page&apos;s metric card — evidence, not dashboard. Every
        state below is the real component fed a fixture; nothing is restyled
        for display.
      </CatalogueHeader>

      <Group id="judged" title="Judged against a target">
        <Spec
          id="numbers/on-track"
          title="On track — higher is better"
          when="value ≥ target with higher_is_better polarity"
          note="One message per card: the line wears the caption's verdict. On track, both green; the dashed guide is the target inside the sparkline's own domain."
        >
          <MetricCard
            label="ROAS"
            kind="ratio"
            value={3.3}
            target={3.0}
            targetLabel="Blended ROAS"
            polarity="higher_is_better"
            series={RISING}
          />
        </Spec>

        <Spec
          id="numbers/off-track"
          title="Off track — higher is better"
          when="value < target with higher_is_better polarity"
          note="Caption and line agree: off track, both red."
        >
          <MetricCard
            label="ROAS"
            kind="ratio"
            value={2.4}
            target={3.0}
            targetLabel="Blended ROAS"
            polarity="higher_is_better"
            series={FALLING}
          />
        </Spec>

        <Spec
          id="numbers/lower-on-track"
          title="On track — lower is better"
          when="value ≤ target with lower_is_better polarity (CPA-shaped)"
          note="The FALLING series reads green here — the verdict decides the colour, the geometry never flips."
        >
          <MetricCard
            label="CPA/CPO"
            kind="money"
            value={38}
            target={45}
            targetLabel="CPA"
            polarity="lower_is_better"
            series={FALLING_MONEY}
          />
        </Spec>

        <Spec
          id="numbers/lower-off-track"
          title="Off track — lower is better"
          when="value > target with lower_is_better polarity"
        >
          <MetricCard
            label="CPA/CPO"
            kind="money"
            value={56}
            target={45}
            targetLabel="CPA"
            polarity="lower_is_better"
            series={RISING_MONEY}
          />
        </Spec>

        <Spec
          id="numbers/per-day"
          title="Pro-rated daily target"
          when="an additive metric (spend, sales, revenue) judged against target ÷ daily divisor"
          note="The '/day' suffix — a period target judged per day."
        >
          <MetricCard
            label="Spend"
            kind="money"
            value={5600}
            target={6000}
            targetLabel="Weekly spend"
            perDay
            polarity="lower_is_better"
            series={series([
              6200, 6100, 6150, 6000, 5900, 5950, 5800, 5750, 5800, 5700,
              5650, 5700, 5600, 5600,
            ])}
          />
        </Spec>
      </Group>

      <Group id="unjudged" title="Unjudged">
        <Spec
          id="numbers/no-target"
          title="No target"
          when="the client profile has no KPI mapped to this metric"
          note="No target line, no dashed guide — the sparkline still takes the drift's tone."
        >
          <MetricCard
            label="NC ROAS"
            kind="ratio"
            value={3.3}
            targetLabel={undefined}
            polarity="higher_is_better"
            series={RISING}
          />
        </Spec>

        <Spec
          id="numbers/neutral"
          title="Neutral polarity"
          when="deltaPolarity has no verdict for the metric"
          note="Grey line regardless of drift; a target would render in soft ink."
        >
          <MetricCard
            label="NVP"
            kind="percent"
            value={42.5}
            polarity="neutral"
            series={RISING}
          />
        </Spec>

        <Spec
          id="numbers/flat"
          title="Flat drift"
          when="no target to judge, and drift under the 2% band"
          note="Grey line even with judged polarity — without a target verdict, a trend smaller than noise is not one either."
        >
          <MetricCard
            label="Revenue"
            kind="money"
            value={50.1}
            polarity="higher_is_better"
            series={FLAT}
          />
        </Spec>
      </Group>

      <Group id="degraded" title="Degraded">
        <Spec
          id="numbers/unavailable"
          title="Unavailable"
          when="the source marks the figure n/a and says why"
          note="The reason is the source's own words, verbatim."
        >
          <MetricCard
            label="NCAC"
            kind="money"
            value={undefined}
            unavailable="Tracker column empty for this date"
            polarity="lower_is_better"
            series={[]}
          />
        </Spec>

        <Spec
          id="numbers/sparse"
          title="Too sparse to draw"
          when="fewer than two days carry the metric"
          note="No sparkline at all — one point is not a trend."
        >
          <MetricCard
            label="NC ROAS"
            kind="ratio"
            value={2.9}
            polarity="higher_is_better"
            series={series([2.9]).slice(0, 1)}
          />
        </Spec>

        <Spec
          id="numbers/empty"
          title="Tab empty state"
          when="no daily rows have compiled yet for the client"
        >
          <EmptyState title="No daily numbers yet">
            Once the nightly compile runs, Birkenstock&apos;s last 14 days land
            here — each figure stamped with where it came from.
          </EmptyState>
        </Spec>
      </Group>
    </div>
  );
}
