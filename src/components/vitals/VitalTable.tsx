import type { PatientObservation } from "@/lib/vitals/types";

export type VitalTableRow = {
  observation: PatientObservation;
  vitalLabel: string;
  vitalShortLabel: string;
  valueLabel: string;
  sourceLabel: string;
};

export default function VitalTable({
  rows,
}: {
  rows: VitalTableRow[];
}) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[700px] text-left">
        <thead>
          <tr className="border-b border-[var(--border)] bg-[var(--surface-subtle)]">
            <th className="px-6 py-3 text-[10px] font-semibold uppercase tracking-[0.08em] text-[var(--foreground-muted)]">
              Date / time
            </th>
            <th className="px-6 py-3 text-[10px] font-semibold uppercase tracking-[0.08em] text-[var(--foreground-muted)]">
              Vital
            </th>
            <th className="px-6 py-3 text-[10px] font-semibold uppercase tracking-[0.08em] text-[var(--foreground-muted)]">
              Reading
            </th>
            <th className="px-6 py-3 text-[10px] font-semibold uppercase tracking-[0.08em] text-[var(--foreground-muted)]">
              Source
            </th>
            <th className="px-6 py-3 text-[10px] font-semibold uppercase tracking-[0.08em] text-[var(--foreground-muted)]">
              Recorded by
            </th>
          </tr>
        </thead>

        <tbody className="divide-y divide-[var(--border)]">
          {rows.map(({ observation, vitalLabel, vitalShortLabel, valueLabel, sourceLabel }) => (
            <tr
              key={observation.id}
              className="transition-colors hover:bg-[var(--surface-subtle)]"
            >
              <td className="whitespace-nowrap px-6 py-3.5 text-sm text-[var(--foreground-secondary)]">
                {new Date(observation.recorded_at).toLocaleString([], {
                  day: "2-digit",
                  month: "short",
                  year: "numeric",
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </td>

              <td className="px-6 py-3.5">
                <div className="flex items-center gap-2.5">
                  <span className="flex h-7 w-7 items-center justify-center rounded-[8px] bg-[var(--surface-muted)] text-[10px] font-semibold text-[var(--foreground-secondary)]">
                    {vitalShortLabel.slice(0, 3)}
                  </span>

                  <span className="text-sm font-medium text-[var(--foreground)]">
                    {vitalLabel}
                  </span>
                </div>
              </td>

              <td className="px-6 py-3.5 text-sm font-semibold text-[var(--foreground)]">
                {valueLabel}
              </td>

              <td className="px-6 py-3.5 text-sm text-[var(--foreground-secondary)]">
                {sourceLabel}
              </td>

              <td className="px-6 py-3.5 text-sm text-[var(--foreground-secondary)]">
                {observation.recorded_by || "—"}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
