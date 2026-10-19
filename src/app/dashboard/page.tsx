import type { ReactNode } from "react";
import Link from "next/link";
import { auth, currentUser } from "@clerk/nextjs/server";
import { createSupabaseClient } from "@/lib/supabase";

import TrendMetricCard from "@/components/health-trends/TrendMetricCard";
import { getAllHealthTrendObservations } from "@/lib/health-trends/data";
import { calculateHealthTrends } from "@/lib/health-trends/engine";
import { normalizeObservations } from "@/lib/health-trends/normalization";
import { createDashboardDefaultsFromTrends } from "@/lib/health-trends/preferences";
import type { HealthTrend } from "@/lib/health-trends/types";

type HealthProfile = {
  date_of_birth: string | null;
  biological_sex: string | null;
  height_cm: number | null;
  weight_kg: number | null;
  blood_group: string | null;
};

type MedicalReport = {
  id: string;
  original_file_name: string | null;
  report_type: string | null;
  report_date: string | null;
  uploaded_at: string | null;
};

type Medication = {
  id: string;
  medicine_name: string | null;
  dosage: string | null;
  frequency: string | null;
  status: string | null;
};

type Condition = {
  id: string;
  condition_name: string | null;
  status: string | null;
  created_at: string | null;
};

type HealthGoal = {
  id: string;
  title: string | null;
  status: string | null;
  created_at: string | null;
};

type HealthInsight = {
  id: string;
  title: string | null;
  category: string | null;
  insight_date: string | null;
  notes: string | null;
  created_at: string | null;
};

function formatDate(
  value: string | null | undefined,
) {
  if (!value) return "—";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "—";
  }

  return new Intl.DateTimeFormat("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(date);
}

function getGreeting() {
  const hour = new Date().getHours();

  if (hour < 12) return "Good morning";
  if (hour < 18) return "Good afternoon";

  return "Good evening";
}

function getFirstName(
  user: Awaited<ReturnType<typeof currentUser>>,
) {
  return (
    user?.firstName ||
    user?.username ||
    user?.primaryEmailAddress?.emailAddress?.split(
      "@",
    )[0] ||
    "there"
  );
}

function formatValue(
  value: number | null,
  suffix: string,
) {
  if (
    value === null ||
    !Number.isFinite(value)
  ) {
    return "—";
  }

  return `${Number.isInteger(value) ? value : value.toFixed(1)} ${suffix}`;
}

function Icon({
  name,
  className = "h-5 w-5",
}: {
  name: string;
  className?: string;
}) {
  const common = {
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.7,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    className,
    "aria-hidden": true,
  };

  switch (name) {
    case "file":
      return (
        <svg {...common}>
          <path d="M7 3.5h7l4 4V20a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1V4.5a1 1 0 0 1 1-1Z" />
          <path d="M14 3.5V8h4M9 12h6M9 15.5h5" />
        </svg>
      );

    case "pill":
      return (
        <svg {...common}>
          <path d="m8.2 15.8 7.6-7.6a4.2 4.2 0 0 1 6 6l-7.6 7.6a4.2 4.2 0 0 1-6-6Z" />
          <path d="m9.6 14.4 6 6M3.8 8.2a4.2 4.2 0 0 1 6-6l4 4-6 6-4-4Z" />
        </svg>
      );

    case "condition":
      return (
        <svg {...common}>
          <circle cx="12" cy="12" r="8.5" />
          <path d="M8 12h8M12 8v8" />
        </svg>
      );

    case "goal":
      return (
        <svg {...common}>
          <circle cx="12" cy="12" r="8.5" />
          <circle cx="12" cy="12" r="5" />
          <circle cx="12" cy="12" r="1.5" />
        </svg>
      );

    case "spark":
      return (
        <svg {...common}>
          <path d="m12 3 1.5 5.5L19 10l-5.5 1.5L12 17l-1.5-5.5L5 10l5.5-1.5L12 3Z" />
        </svg>
      );

    case "calendar":
      return (
        <svg {...common}>
          <rect
            x="4"
            y="5.5"
            width="16"
            height="14"
            rx="2"
          />
          <path d="M8 3v5M16 3v5M4 10h16" />
        </svg>
      );

    case "profile":
      return (
        <svg {...common}>
          <circle cx="12" cy="8" r="3.2" />
          <path d="M5.5 20c.8-3.2 3-5 6.5-5s5.7 1.8 6.5 5" />
        </svg>
      );

    case "arrow":
      return (
        <svg {...common}>
          <path d="M5 12h13M13 6l6 6-6 6" />
        </svg>
      );

    case "chevron":
      return (
        <svg {...common}>
          <path d="m9 18 6-6-6-6" />
        </svg>
      );

    case "check":
      return (
        <svg {...common}>
          <path d="m5 12.5 4.2 4.5L19 7" />
        </svg>
      );

    case "search":
      return (
        <svg {...common}>
          <circle cx="11" cy="11" r="6.5" />
          <path d="m16 16 4 4" />
        </svg>
      );

    default:
      return (
        <svg {...common}>
          <circle cx="12" cy="12" r="8" />
        </svg>
      );
  }
}

function Card({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <section
      className={`overflow-hidden rounded-[16px] border border-[#dfe8e7] bg-white shadow-[0_1px_2px_rgba(20,50,48,0.03),0_8px_24px_rgba(20,50,48,0.035)] ${className}`}
    >
      {children}
    </section>
  );
}

function SectionHeader({
  eyebrow,
  title,
  href,
}: {
  eyebrow?: string;
  title: string;
  href?: string;
}) {
  return (
    <div className="flex items-start justify-between gap-4">
      <div>
        {eyebrow ? (
          <p className="text-[9px] font-semibold uppercase tracking-[0.16em] text-[#93a5a4]">
            {eyebrow}
          </p>
        ) : null}

        <h2 className="mt-1 text-[17px] font-semibold leading-5 tracking-[-0.025em] text-[#142f2d]">
          {title}
        </h2>
      </div>

      {href ? (
        <Link
          href={href}
          className="group inline-flex items-center gap-1 text-[11px] font-semibold text-[#168b7b] hover:text-[#0e7467]"
        >
          View all
          <Icon
            name="arrow"
            className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5"
          />
        </Link>
      ) : null}
    </div>
  );
}

function SummaryCard({
  icon,
  label,
  value,
  detail,
  href,
  tone,
  bars,
}: {
  icon: string;
  label: string;
  value: string;
  detail: string;
  href: string;
  tone:
    | "teal"
    | "blue"
    | "amber"
    | "violet";
  bars: number[];
}) {
  const tones = {
    teal: {
      icon: "bg-[#e2f5f1] text-[#15927e]",
      bar: "bg-[#33b8a5]",
    },
    blue: {
      icon: "bg-[#e5f1fb] text-[#318bc9]",
      bar: "bg-[#58aee1]",
    },
    amber: {
      icon: "bg-[#fff3d9] text-[#d79a24]",
      bar: "bg-[#e4aa38]",
    },
    violet: {
      icon: "bg-[#eee9ff] text-[#7759d6]",
      bar: "bg-[#8063dc]",
    },
  }[tone];

  return (
    <Link
      href={href}
      className="group block h-[126px] rounded-[16px] border border-[#dfe8e7] bg-white p-4 shadow-[0_1px_2px_rgba(20,50,48,0.03),0_8px_24px_rgba(20,50,48,0.035)] transition hover:-translate-y-0.5 hover:shadow-[0_10px_28px_rgba(20,50,48,0.08)]"
    >
      <div className="flex items-start justify-between">
        <span
          className={`flex h-9 w-9 items-center justify-center rounded-[11px] ${tones.icon}`}
        >
          <Icon
            name={icon}
            className="h-[18px] w-[18px]"
          />
        </span>

        <span className="flex h-9 items-end gap-[3px] opacity-80">
          {bars.map((height, index) => (
            <span
              key={index}
              className={`w-[5px] rounded-full ${tones.bar}`}
              style={{
                height: `${height}px`,
              }}
            />
          ))}
        </span>
      </div>

      <p className="mt-3 text-[10px] font-medium text-[#748786]">
        {label}
      </p>

      <div className="mt-0.5 flex items-baseline gap-2">
        <span className="text-[24px] font-semibold leading-7 tracking-[-0.045em] text-[#142f2d]">
          {value}
        </span>

        <span className="truncate text-[10px] font-semibold text-[#168b7b]">
          {detail}
        </span>
      </div>
    </Link>
  );
}

function EmptyState({
  title,
  description,
  href,
  action,
}: {
  title: string;
  description: string;
  href?: string;
  action?: string;
}) {
  return (
    <div className="flex h-full min-h-[150px] flex-col items-center justify-center rounded-[12px] border border-dashed border-[#dfe8e7] bg-[#f8fbfa] px-5 text-center">
      <p className="text-[13px] font-semibold text-[#183331]">
        {title}
      </p>

      <p className="mt-1 max-w-xs text-[11px] leading-4 text-[#7b8d8b]">
        {description}
      </p>

      {href && action ? (
        <Link
          href={href}
          className="mt-3 text-[11px] font-semibold text-[#168b7b]"
        >
          {action} →
        </Link>
      ) : null}
    </div>
  );
}

function CompletenessCard({
  profile,
  reports,
  medications,
  conditions,
  goals,
}: {
  profile: HealthProfile | null;
  reports: MedicalReport[];
  medications: Medication[];
  conditions: Condition[];
  goals: HealthGoal[];
}) {
  const checks = [
    {
      label: "Health profile",
      complete: Boolean(profile),
    },
    {
      label: "Medical reports",
      complete: reports.length > 0,
    },
    {
      label: "Medications",
      complete: medications.length > 0,
    },
    {
      label: "Conditions",
      complete: conditions.length > 0,
    },
    {
      label: "Health goals",
      complete: goals.length > 0,
    },
  ];

  const completed = checks.filter(
    (item) => item.complete,
  ).length;

  const percentage = Math.round(
    (completed / checks.length) * 100,
  );

  return (
    <Card className="min-h-[300px] p-5 sm:p-6">
      <SectionHeader
        eyebrow="Health foundation"
        title="Record completeness"
        href="/dashboard/health-profile"
      />

      <div className="mt-5 flex items-end justify-between">
        <div>
          <p className="text-[31px] font-semibold leading-none tracking-[-0.05em] text-[#142f2d]">
            {percentage}%
          </p>

          <p className="mt-1 text-[10px] text-[#7d8e8c]">
            {completed} of {checks.length} core areas
            started
          </p>
        </div>

        <span className="text-[10px] font-semibold text-[#168b7b]">
          {percentage === 100
            ? "Complete"
            : "In progress"}
        </span>
      </div>

      <div className="mt-4 h-2 overflow-hidden rounded-full bg-[#e8efed]">
        <span
          className="block h-full rounded-full bg-[#27ae99]"
          style={{
            width: `${percentage}%`,
          }}
        />
      </div>

      <div className="mt-5 space-y-2">
        {checks.map((item) => (
          <div
            key={item.label}
            className="flex items-center justify-between rounded-[9px] bg-[#f8fbfa] px-3 py-2"
          >
            <span className="text-[10px] font-medium text-[#536764]">
              {item.label}
            </span>

            <span
              className={`flex h-5 w-5 items-center justify-center rounded-full ${
                item.complete
                  ? "bg-[#e2f5f1] text-[#15927e]"
                  : "bg-[#edf1f0] text-[#9ba9a7]"
              }`}
            >
              {item.complete ? (
                <Icon
                  name="check"
                  className="h-3 w-3"
                />
              ) : (
                <span className="text-[10px]">
                  •
                </span>
              )}
            </span>
          </div>
        ))}
      </div>
    </Card>
  );
}

function getDashboardTrends(
  trends: HealthTrend[],
  userId: string,
): HealthTrend[] {
  const defaults =
    createDashboardDefaultsFromTrends(
      userId,
      trends,
      4,
    );

  const selectedIds = new Set(
    defaults.map(
      (item) => item.metricId,
    ),
  );

  return trends.filter((trend) =>
    selectedIds.has(trend.metric.id),
  );
}

function getTrendSummary(
  trend: HealthTrend,
): string {
  switch (trend.pattern) {
    case "PERSISTENT_INCREASE":
      return "Persistent increase";

    case "PERSISTENT_DECREASE":
      return "Persistent decrease";

    case "SUDDEN_INCREASE":
      return "Sudden increase";

    case "SUDDEN_DECREASE":
      return "Sudden decrease";

    case "INCREASING":
      return "Increasing";

    case "DECREASING":
      return "Decreasing";

    case "FLUCTUATING":
      return "Fluctuating";

    case "STABLE":
      return "Stable";

    default:
      return "Limited data";
  }
}

export default async function DashboardPage() {
  const { userId, getToken } = await auth();

  if (!userId) {
    return null;
  }

  const user = await currentUser();
  const token = await getToken();

  if (!token) {
    return null;
  }

  const supabase =
    createSupabaseClient(token);

  const trendDataPromise =
    getAllHealthTrendObservations(
      token,
      userId,
    );

    const [
      profileResult,
      reportsResult,
      reportsCountResult,
      medicationsResult,
      conditionsResult,
      goalsResult,
      insightsResult,
    ] = await Promise.all([
    supabase
      .from("health_profiles")
      .select(
        "date_of_birth, biological_sex, height_cm, weight_kg, blood_group",
      )
      .eq("user_id", userId)
      .maybeSingle(),

    supabase
      .from("medical_reports")
      .select(
        "id, original_file_name, report_type, report_date, uploaded_at",
      )
      .eq("user_id", userId)
      .order("uploaded_at", {
        ascending: false,
      })
      .limit(6),

      supabase
  .from("medical_reports")
  .select("id", { count: "exact", head: true })
  .eq("user_id", userId),

    supabase
      .from("medications")
      .select(
        "id, medicine_name, dosage, frequency, status",
      )
      .eq("user_id", userId)
      .eq("status", "Active")
      .order("created_at", {
        ascending: false,
      })
      .limit(6),

    supabase
      .from("health_conditions")
      .select(
        "id, condition_name, status, created_at",
      )
      .eq("user_id", userId)
      .order("created_at", {
        ascending: false,
      })
      .limit(6),

    supabase
      .from("health_goals")
      .select(
        "id, title, status, created_at",
      )
      .eq("user_id", userId)
      .order("created_at", {
        ascending: false,
      })
      .limit(6),

    supabase
      .from("health_insights")
      .select(
        "id, title, category, insight_date, notes, created_at",
      )
      .eq("user_id", userId)
      .order("created_at", {
        ascending: false,
      })
      .limit(6),
  ]);

  const profile =
    (profileResult.data as HealthProfile | null) ??
    null;

  const reports =
    (reportsResult.data as MedicalReport[] | null) ??
    [];
    const reportCount = reportsCountResult.count ?? 0;

  const medications =
    (medicationsResult.data as Medication[] | null) ??
    [];

  const conditions =
    (conditionsResult.data as Condition[] | null) ??
    [];

  const goals =
    (goalsResult.data as HealthGoal[] | null) ??
    [];

  const insights =
    (insightsResult.data as HealthInsight[] | null) ??
    [];

  const trendData =
    await trendDataPromise;

  const normalizedTrendData =
    normalizeObservations(
      trendData,
    ).normalized.map(
      (item) => item.measurement,
    );

  const healthTrends =
    calculateHealthTrends(
      normalizedTrendData,
      "ALL",
    );

  const dashboardTrends =
    getDashboardTrends(
      healthTrends,
      userId,
    );

  const detectedTrendChanges =
    healthTrends
      .filter(
        (trend) =>
          trend.pattern !== "STABLE" &&
          trend.pattern !==
            "INSUFFICIENT_EVIDENCE" &&
          trend.measurementCount >= 2,
      )
      .sort((a, b) => {
        const patternPriority = (
          trend: HealthTrend,
        ) => {
          switch (trend.pattern) {
            case "SUDDEN_INCREASE":
            case "SUDDEN_DECREASE":
              return 5;

            case "PERSISTENT_INCREASE":
            case "PERSISTENT_DECREASE":
              return 4;

            case "INCREASING":
            case "DECREASING":
              return 3;

            case "FLUCTUATING":
              return 2;

            default:
              return 0;
          }
        };

        return (
          patternPriority(b) -
          patternPriority(a)
        );
      })
      .slice(0, 3);

  const latestReport =
    reports[0] ?? null;

  const latestInsight =
    insights[0] ?? null;

  const attentionItems = [
    ...insights.slice(0, 2).map(
      (insight) => ({
        id: `insight-${insight.id}`,
        title:
          insight.title ||
          "Health insight",
        detail:
          insight.category ||
          "Review insight",
        href: "/dashboard/health-insights",
        icon: "spark",
      }),
    ),

    ...conditions
      .filter(
        (condition) =>
          condition.status &&
          ![
            "active",
            "stable",
            "resolved",
            "inactive",
          ].includes(
            condition.status.toLowerCase(),
          ),
      )
      .slice(0, 2)
      .map((condition) => ({
        id: `condition-${condition.id}`,
        title:
          condition.condition_name ||
          "Health condition",
        detail:
          condition.status ||
          "Review condition",
        href: "/dashboard/health-conditions",
        icon: "condition",
      })),
  ].slice(0, 3);

  const recordReadyCount = [
    Boolean(profile),
    reports.length > 0,
    medications.length > 0,
    conditions.length > 0,
    goals.length > 0,
  ].filter(Boolean).length;

  return (
    <main className="min-h-full bg-[#f5f9f8] text-[#142f2d]">
      <div className="mx-auto w-full max-w-[1420px] px-4 pb-10 pt-5 sm:px-6 lg:px-7 xl:px-8">
        {/* Header */}
        <section className="mb-5">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <div className="flex items-center gap-2">
                <span
                  className="text-[19px]"
                  aria-hidden="true"
                >
                  👋
                </span>

                <p className="text-[12px] font-semibold text-[#168b7b]">
                  {getGreeting()},{" "}
                  {getFirstName(user)}
                </p>
              </div>

              <h1 className="mt-1 text-[29px] font-semibold leading-[1.08] tracking-[-0.045em] text-[#102d2b] sm:text-[32px]">
                Your health, at a glance.
              </h1>

              <p className="mt-1.5 max-w-[690px] text-[12px] leading-5 text-[#6d817f]">
                A clear view of your health record,
                current treatment, important changes and
                goals.
              </p>
            </div>

            <div className="flex items-center gap-2.5 rounded-[12px] border border-[#dfe9e7] bg-white px-3.5 py-2.5 shadow-[0_1px_2px_rgba(20,50,48,0.03)]">
              <span className="flex h-7 w-7 items-center justify-center rounded-full bg-[#e5f7f2] text-[#15927e]">
                <Icon
                  name="check"
                  className="h-3.5 w-3.5"
                />
              </span>

              <div>
                <p className="text-[10px] font-semibold text-[#425856]">
                  {recordReadyCount
                    ? "Health record is active"
                    : "Start your health record"}
                </p>

                <p className="mt-0.5 text-[9px] text-[#8b9a98]">
                  {latestReport
                    ? `Latest report ${formatDate(
                        latestReport.report_date ||
                          latestReport.uploaded_at,
                      )}`
                    : "No reports yet"}
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Summary cards */}
        <section className="mb-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <SummaryCard
            icon="pill"
            label="Medications"
            value={String(
              medications.length,
            )}
            detail="Active →"
            href="/dashboard/medications"
            tone="teal"
            bars={[
              13,
              18,
              25,
              31,
              23,
              28,
              7,
            ]}
          />

          <SummaryCard
            icon="file"
            label="Medical reports"
            value={String(reportCount)}
            detail="Recent →"
            href="/dashboard/medical-reports"
            tone="blue"
            bars={[
              18,
              24,
              16,
              29,
              22,
              34,
              11,
            ]}
          />

          <SummaryCard
            icon="condition"
            label="Conditions"
            value={String(
              conditions.length,
            )}
            detail="Recorded →"
            href="/dashboard/health-conditions"
            tone="amber"
            bars={[
              27,
              20,
              31,
              22,
              29,
              25,
              10,
            ]}
          />

          <SummaryCard
            icon="goal"
            label="Health goals"
            value={String(
              goals.length,
            )}
            detail="Tracked →"
            href="/dashboard/health-goals"
            tone="violet"
            bars={[
              14,
              19,
              23,
              21,
              29,
              34,
              9,
            ]}
          />
        </section>

        {/* Main intelligence row */}
        <section className="mb-4 grid gap-4 xl:grid-cols-[minmax(0,1.72fr)_minmax(300px,0.8fr)]">
          <Card className="min-h-[300px] p-5 sm:p-6">
            <SectionHeader
              eyebrow="Longitudinal health"
              title="Your Health Trends"
              href="/dashboard/health-trends"
            />

            <p className="mt-1 text-[10px] leading-4 text-[#879795]">
              See how your recorded health measurements
              are changing over time.
            </p>

            {dashboardTrends.length ? (
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                {dashboardTrends.map(
                  (trend) => (
                    <TrendMetricCard
                      key={trend.metric.id}
                      trend={trend}
                      href={`/dashboard/health-trends/${encodeURIComponent(
                        trend.metric.id,
                      )}`}
                      compact
                      showChart
                    />
                  ),
                )}
              </div>
            ) : (
              <div className="mt-4">
                <EmptyState
                  title="Your health trends will appear here"
                  description="Add medical reports with measurable results to build your longitudinal health record."
                  href="/dashboard/medical-reports"
                  action="Add a medical report"
                />
              </div>
            )}

            <div className="mt-4 flex items-center justify-between border-t border-[#edf2f1] pt-3">
              <span className="text-[9px] text-[#849391]">
                {dashboardTrends.length} tracked trend
                {dashboardTrends.length === 1
                  ? ""
                  : "s"}
              </span>

              <Link
                href="/dashboard/health-trends"
                className="text-[10px] font-semibold text-[#168b7b] hover:text-[#0e7467]"
              >
                Explore all trends →
              </Link>
            </div>
          </Card>

          <CompletenessCard
            profile={profile}
            reports={reports}
            medications={medications}
            conditions={conditions}
            goals={goals}
          />
        </section>

        {/* Intelligence row */}
        <section className="mb-4 grid gap-4 lg:grid-cols-3">
          <Card className="min-h-[245px] p-5">
            <SectionHeader
              title="Recent trend changes"
              href="/dashboard/health-trends"
            />

            <div className="mt-3 space-y-1">
              {detectedTrendChanges.length ? (
                detectedTrendChanges.map(
                  (trend) => (
                    <Link
                      key={trend.metric.id}
                      href={`/dashboard/health-trends/${encodeURIComponent(
                        trend.metric.id,
                      )}`}
                      className="group flex items-center gap-3 rounded-[10px] px-2 py-2 transition hover:bg-[#f5faf9]"
                    >
                      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[9px] bg-[#e8f6f2] text-[#15927e]">
                        <Icon
                          name="spark"
                          className="h-4 w-4"
                        />
                      </span>

                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-[11px] font-semibold text-[#29413f] group-hover:text-[#168b7b]">
                          {
                            trend.metric
                              .displayName
                          }
                        </span>

                        <span className="mt-0.5 block truncate text-[9px] text-[#8a9a98]">
                          {getTrendSummary(
                            trend,
                          )}{" "}
                          ·{" "}
                          {
                            trend.measurementCount
                          }{" "}
                          measurement
                          {trend.measurementCount ===
                          1
                            ? ""
                            : "s"}
                        </span>
                      </span>

                      <Icon
                        name="chevron"
                        className="h-3.5 w-3.5 shrink-0 text-[#b0bfbd]"
                      />
                    </Link>
                  ),
                )
              ) : (
                <div className="pt-2">
                  <EmptyState
                    title="No trend changes yet"
                    description="Changes will appear here when enough measurements are available."
                    href="/dashboard/health-trends"
                    action="Explore Health Trends"
                  />
                </div>
              )}
            </div>
          </Card>

          <Card className="min-h-[245px] p-5">
            <SectionHeader
              title="Needs your attention"
              href="/dashboard/health-insights"
            />

            {attentionItems.length ? (
              <div className="mt-3 space-y-1">
                {attentionItems.map(
                  (item) => (
                    <Link
                      key={item.id}
                      href={item.href}
                      className="group flex items-center gap-3 rounded-[10px] px-2 py-2.5 transition hover:bg-[#fffaf0]"
                    >
                      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[9px] bg-[#fff2d7] text-[#d89b25]">
                        <Icon
                          name={item.icon}
                          className="h-4 w-4"
                        />
                      </span>

                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-[11px] font-semibold text-[#29413f] group-hover:text-[#168b7b]">
                          {item.title}
                        </span>

                        <span className="mt-0.5 block truncate text-[9px] text-[#8a9a98]">
                          {item.detail}
                        </span>
                      </span>

                      <Icon
                        name="chevron"
                        className="h-3.5 w-3.5 shrink-0 text-[#b0bfbd]"
                      />
                    </Link>
                  ),
                )}
              </div>
            ) : (
              <div className="mt-4 rounded-[12px] bg-[#eaf8f4] p-4">
                <div className="flex gap-2.5">
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[9px] bg-white text-[#15927e]">
                    <Icon
                      name="check"
                      className="h-4 w-4"
                    />
                  </span>

                  <div>
                    <p className="text-[11px] font-semibold text-[#21403c]">
                      Nothing needs review right now
                    </p>

                    <p className="mt-1 text-[9px] leading-4 text-[#718783]">
                      New insights and unusual record items
                      will surface here.
                    </p>
                  </div>
                </div>
              </div>
            )}
          </Card>

          <Card className="min-h-[245px] p-5">
            <SectionHeader
              title="Your goals"
              href="/dashboard/health-goals"
            />

            {goals.length ? (
              <div className="mt-4 space-y-4">
                {goals
                  .slice(0, 4)
                  .map((goal, index) => (
                    <Link
                      key={goal.id}
                      href="/dashboard/health-goals"
                      className="group block"
                    >
                      <div className="flex items-center justify-between gap-3">
                        <span className="truncate text-[10px] font-semibold text-[#526765] group-hover:text-[#168b7b]">
                          {goal.title ||
                            "Health goal"}
                        </span>

                        <span className="shrink-0 text-[9px] text-[#8b9a98]">
                          {goal.status ||
                            "Active"}
                        </span>
                      </div>

                      <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-[#e8eeee]">
                        <span
                          className="block h-full rounded-full bg-[#27ae99]"
                          style={{
                            width: `${Math.min(
                              88,
                              34 +
                                index * 16,
                            )}%`,
                          }}
                        />
                      </div>
                    </Link>
                  ))}
              </div>
            ) : (
              <div className="mt-4">
                <EmptyState
                  title="No goals yet"
                  description="Create a goal to give your health plan a clear direction."
                  href="/dashboard/health-goals"
                  action="Create a goal"
                />
              </div>
            )}
          </Card>
        </section>

        {/* Insight banner */}
        {latestInsight ? (
          <section className="mb-4">
            <div className="relative overflow-hidden rounded-[16px] border border-[#cfeee6] bg-[#e8f8f4] px-5 py-5 sm:px-7">
              <div className="relative z-10 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-start gap-3">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[10px] bg-white text-[#15927e] shadow-sm">
                    <Icon
                      name="spark"
                      className="h-4 w-4"
                    />
                  </span>

                  <div>
                    <p className="text-[9px] font-semibold uppercase tracking-[0.15em] text-[#168b7b]">
                      Previa insight
                    </p>

                    <h2 className="mt-1 text-[17px] font-semibold tracking-[-0.025em] text-[#173532]">
                      {latestInsight.title ||
                        "Your health data tells a bigger story."}
                    </h2>

                    <p className="mt-1 max-w-[700px] text-[10px] leading-4 text-[#66817c]">
                      {latestInsight.notes ||
                        "Review your latest health insight to understand what has changed across your record."}
                    </p>
                  </div>
                </div>

                <Link
                  href="/dashboard/health-insights"
                  className="inline-flex shrink-0 items-center justify-center gap-1.5 rounded-[9px] bg-[#118575] px-4 py-2.5 text-[10px] font-semibold text-white transition hover:bg-[#0d7063]"
                >
                  View insights
                  <Icon
                    name="arrow"
                    className="h-3.5 w-3.5"
                  />
                </Link>
              </div>

              <div className="pointer-events-none absolute -right-8 -top-14 h-36 w-36 rounded-full bg-white/60 blur-2xl" />
            </div>
          </section>
        ) : null}

        {/* Bottom cards */}
        <section className="grid gap-4 lg:grid-cols-3">
          <Card className="min-h-[250px] p-5">
            <SectionHeader
              eyebrow="Medical record"
              title="Latest medical report"
              href="/dashboard/medical-reports"
            />

            {latestReport ? (
              <Link
                href={`/dashboard/medical-reports/${latestReport.id}`}
                className="group mt-4 block rounded-[12px] border border-[#e5eceb] bg-[#fbfdfc] p-3.5 transition hover:border-[#cfe1de]"
              >
                <div className="flex gap-3">
                  <div className="flex h-[76px] w-[60px] shrink-0 items-center justify-center rounded-[9px] border border-[#dfe8e7] bg-white text-[#318bc9]">
                    <Icon
                      name="file"
                      className="h-7 w-7"
                    />
                  </div>

                  <div className="min-w-0 pt-1">
                    <p className="truncate text-[11px] font-semibold text-[#263f3d] group-hover:text-[#168b7b]">
                      {latestReport.original_file_name ||
                        latestReport.report_type ||
                        "Medical report"}
                    </p>

                    <p className="mt-1 text-[9px] text-[#839390]">
                      {latestReport.report_type ||
                        "Medical report"}
                    </p>

                    <p className="mt-1 text-[9px] text-[#a0aeac]">
                      {formatDate(
                        latestReport.report_date ||
                          latestReport.uploaded_at,
                      )}
                    </p>
                  </div>
                </div>

                <div className="mt-3 flex items-center justify-center gap-1 rounded-[8px] border border-[#dfe8e7] bg-white py-2 text-[10px] font-semibold text-[#526765]">
                  View summary
                  <Icon
                    name="arrow"
                    className="h-3.5 w-3.5"
                  />
                </div>
              </Link>
            ) : (
              <div className="mt-4">
                <EmptyState
                  title="No medical reports yet"
                  description="Upload your first report to begin building your structured health record."
                  href="/dashboard/medical-reports"
                  action="Add medical report"
                />
              </div>
            )}
          </Card>

          <Card className="min-h-[250px] p-5">
            <SectionHeader
              eyebrow="Treatment"
              title="Active medications"
              href="/dashboard/medications"
            />

            {medications.length ? (
              <div className="mt-3 space-y-1">
                {medications
                  .slice(0, 4)
                  .map((medication) => (
                    <Link
                      key={medication.id}
                      href="/dashboard/medications"
                      className="group flex items-center gap-3 rounded-[10px] px-2 py-2.5 transition hover:bg-[#f5faf9]"
                    >
                      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[9px] bg-[#e7f7f3] text-[#15927e]">
                        <Icon
                          name="pill"
                          className="h-4 w-4"
                        />
                      </span>

                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-[11px] font-semibold text-[#29413f] group-hover:text-[#168b7b]">
                          {medication.medicine_name ||
                            "Medication"}
                        </span>

                        <span className="mt-0.5 block truncate text-[9px] text-[#899997]">
                          {[
                            medication.dosage,
                            medication.frequency,
                          ]
                            .filter(Boolean)
                            .join(" · ") ||
                            "Active medication"}
                        </span>
                      </span>

                      <Icon
                        name="chevron"
                        className="h-3.5 w-3.5 shrink-0 text-[#b0bfbd]"
                      />
                    </Link>
                  ))}
              </div>
            ) : (
              <div className="mt-4">
                <EmptyState
                  title="No active medications"
                  description="Your current treatment list will appear here when medicines are added."
                  href="/dashboard/medications"
                  action="Open medications"
                />
              </div>
            )}
          </Card>

          <Card className="min-h-[250px] p-5">
            <SectionHeader
              eyebrow="Health profile"
              title="Your health foundation"
              href="/dashboard/health-profile"
            />

            <div className="mt-4 grid grid-cols-2 gap-2.5">
              {[
                [
                  "Height",
                  formatValue(
                    profile?.height_cm ??
                      null,
                    "cm",
                  ),
                ],
                [
                  "Weight",
                  formatValue(
                    profile?.weight_kg ??
                      null,
                    "kg",
                  ),
                ],
                [
                  "Blood group",
                  profile?.blood_group ||
                    "—",
                ],
                [
                  "Sex",
                  profile?.biological_sex ||
                    "—",
                ],
              ].map(([label, value]) => (
                <div
                  key={label}
                  className="rounded-[10px] bg-[#f7faf9] px-3 py-3"
                >
                  <p className="text-[9px] text-[#8a9a98]">
                    {label}
                  </p>

                  <p className="mt-1 truncate text-[11px] font-semibold text-[#304744]">
                    {value}
                  </p>
                </div>
              ))}
            </div>

            <Link
              href="/dashboard/health-profile"
              className="mt-3 flex items-center justify-center gap-1.5 rounded-[9px] border border-[#dfe8e7] py-2.5 text-[10px] font-semibold text-[#526765] hover:border-[#c9d9d7]"
            >
              {profile
                ? "Open health profile"
                : "Complete health profile"}

              <Icon
                name="arrow"
                className="h-3.5 w-3.5"
              />
            </Link>
          </Card>
        </section>

        <footer className="mt-7 flex flex-col items-center justify-between gap-2 border-t border-[#dfe8e7] pt-4 text-[9px] text-[#9aa8a6] sm:flex-row">
          <span>
            “Better data. A healthier you.”
          </span>

          <span>
            Made with care for your health.
          </span>
        </footer>
      </div>
    </main>
  );
}