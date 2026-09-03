import Link from "next/link";
import { auth, currentUser } from "@clerk/nextjs/server";
import { createSupabaseClient } from "@/lib/supabase";

type TimelinePreviewItem = {
  id: string;
  type: string;
  title: string;
  detail: string | null;
  date: string;
};

export default async function DashboardPage() {
  const { userId, getToken } = await auth();
  const user = await currentUser();

  if (!userId) {
    return null;
  }

  const token = await getToken();
const supabase = createSupabaseClient(token);

const { data: healthProfile } = await supabase
  .from("health_profiles")
  .select(
    "date_of_birth, biological_sex, height_cm, weight_kg, blood_group"
  )
  .eq("user_id", userId)
  .maybeSingle();

  const { data: recentReports } = await supabase
  .from("medical_reports")
  .select("id, original_file_name, report_type, report_date, uploaded_at")
  .eq("user_id", userId)
  .order("report_date", { ascending: false, nullsFirst: false })
  .order("uploaded_at", { ascending: false })
  .limit(3);

  const { data: activeMedications } = await supabase
  .from("medications")
  .select("id, medicine_name, dosage, frequency")
  .eq("user_id", userId)
  .eq("status", "Active")
  .order("created_at", { ascending: false })
  .limit(3);

  const [
    recentConditionsResult,
    recentGoalsResult,
    recentInsightsResult,
    recentTimelineMedicationsResult,
    recentTimelineReportsResult,
  ] = await Promise.all([
    supabase
      .from("health_conditions")
      .select("id, condition_name, status, diagnosed_date, created_at")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(5),

    supabase
      .from("health_goals")
      .select("id, title, status, target_date, created_at")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(5),

    supabase
      .from("health_insights")
      .select("id, title, category, insight_date, created_at")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(5),

    supabase
      .from("medications")
      .select("id, medicine_name, dosage, frequency, created_at")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(5),

    supabase
      .from("medical_reports")
      .select(
        "id, original_file_name, report_type, report_date, uploaded_at"
      )
      .eq("user_id", userId)
      .order("report_date", { ascending: false, nullsFirst: false })
      .order("uploaded_at", { ascending: false })
      .limit(5),
  ]);

  const timelinePreviewItems: TimelinePreviewItem[] = [
    ...(recentConditionsResult.data ?? []).map((condition) => ({
      id: `condition-${condition.id}`,
      type: "Condition",
      title: condition.condition_name,
      detail: condition.status ? `Status: ${condition.status}` : null,
      date: condition.diagnosed_date || condition.created_at,
    })),

    ...(recentGoalsResult.data ?? []).map((goal) => ({
      id: `goal-${goal.id}`,
      type: "Goal",
      title: goal.title,
      detail: goal.status ? `Status: ${goal.status}` : null,
      date: goal.target_date || goal.created_at,
    })),

    ...(recentInsightsResult.data ?? []).map((insight) => ({
      id: `insight-${insight.id}`,
      type: "Insight",
      title: insight.title,
      detail: insight.category ? `Category: ${insight.category}` : null,
      date: insight.insight_date || insight.created_at,
    })),

    ...(recentTimelineMedicationsResult.data ?? []).map((medication) => ({
      id: `medication-${medication.id}`,
      type: "Medication",
      title: medication.medicine_name,
      detail:
        [medication.dosage, medication.frequency]
          .filter(Boolean)
          .join(" · ") || null,
      date: medication.created_at,
    })),

    ...(recentTimelineReportsResult.data ?? []).map((report) => ({
      id: `report-${report.id}`,
      type: "Medical Report",
      title:
        report.original_file_name ||
        report.report_type ||
        "Medical Report",
      detail: report.report_type ? `Type: ${report.report_type}` : null,
      date: report.report_date || report.uploaded_at,
    })),
  ]
    .sort(
      (firstItem, secondItem) =>
        new Date(secondItem.date).getTime() -
        new Date(firstItem.date).getTime()
    )
    .slice(0, 5);

  const sections = [
    {
      title: "Health Profile",
      description: "Your basic health information and personal health history.",
      href: "/dashboard/health-profile",    },
    {
      title: "Medical Reports",
      description: "Upload and organize your medical reports in one place.",
      href: "/dashboard/medical-reports",
    },
    {
      title: "Medications",
      description: "Keep track of your current and past medications.",
      href: "/dashboard/medications",
    },
    {
      title: "Health Conditions",
      description: "Maintain a structured record of your health conditions.",
      href: "/dashboard/health-conditions",
    },
    {
      title: "Health Goals",
      description: "Set and track your preventive health and wellness goals.",
      href: "/dashboard/health-goals",
    },
    {
      title: "Health Insights",
      description: "Understand your health information with Previa insights.",
      href: "/dashboard/health-insights",
    },
    {
      title: "Health Timeline",
      description: "View your health records together in chronological order.",
      href: "/dashboard/health-timeline",
    },
  ];

  return (
    <main className="min-h-screen bg-zinc-50 px-6 py-10">
      <div className="mx-auto max-w-6xl">
        <div className="mb-10">
          <p className="text-sm font-medium text-teal-700">Previa Health</p>

          <h1 className="mt-2 text-3xl font-semibold tracking-tight text-zinc-900 sm:text-4xl">
  {user?.firstName
    ? `${user.firstName}'s Health Dashboard`
    : "Your Health Dashboard"}
</h1>

          <p className="mt-3 max-w-2xl text-zinc-600">
            Build and organize your lifelong health record in one secure place.
          </p>
        </div>

        <section className="mb-10 rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
        <div className="flex items-center justify-between gap-4">
  <h2 className="text-xl font-semibold text-zinc-900">
    Health Snapshot
  </h2>

  <Link
    href="/dashboard/health-profile"
    className="text-sm font-medium text-teal-700 hover:text-teal-800"
  >
    View profile →
  </Link>
</div>

  {healthProfile ? (
    <dl className="mt-5 grid gap-5 sm:grid-cols-2 lg:grid-cols-5">
      <div>
        <dt className="text-sm text-zinc-500">Date of Birth</dt>
        <dd className="mt-1 font-medium text-zinc-900">
          {healthProfile.date_of_birth || "Not added"}
        </dd>
      </div>

      <div>
        <dt className="text-sm text-zinc-500">Biological Sex</dt>
        <dd className="mt-1 font-medium text-zinc-900">
          {healthProfile.biological_sex || "Not added"}
        </dd>
      </div>

      <div>
        <dt className="text-sm text-zinc-500">Height</dt>
        <dd className="mt-1 font-medium text-zinc-900">
          {healthProfile.height_cm
            ? `${healthProfile.height_cm} cm`
            : "Not added"}
        </dd>
      </div>

      <div>
        <dt className="text-sm text-zinc-500">Weight</dt>
        <dd className="mt-1 font-medium text-zinc-900">
          {healthProfile.weight_kg
            ? `${healthProfile.weight_kg} kg`
            : "Not added"}
        </dd>
      </div>

      <div>
        <dt className="text-sm text-zinc-500">Blood Group</dt>
        <dd className="mt-1 font-medium text-zinc-900">
          {healthProfile.blood_group || "Not added"}
        </dd>
      </div>
    </dl>
  ) : (
    <p className="mt-3 text-sm text-zinc-600">
      Complete your health profile to see your health snapshot here.
    </p>
  )}
</section>

<section className="mb-10 rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
  <div className="flex items-center justify-between gap-4">
    <div>
      <p className="text-sm font-medium text-teal-700">
        Recent activity
      </p>

      <h2 className="mt-1 text-xl font-semibold text-zinc-900">
        Medical Reports
      </h2>
    </div>

    <Link
      href="/dashboard/medical-reports"
      className="text-sm font-medium text-teal-700 hover:text-teal-800"
    >
      View all →
    </Link>
  </div>

  {recentReports && recentReports.length > 0 ? (
    <div className="mt-5 space-y-3">
      {recentReports.map((report) => (
        <Link
          key={report.id}
          href={`/dashboard/medical-reports/${report.id}`}
          className="block rounded-xl border border-zinc-200 bg-zinc-50 p-4 transition hover:bg-zinc-100"
        >
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="font-medium text-zinc-900">
                {report.original_file_name || report.report_type || "Medical Report"}
              </p>

              <p className="mt-1 text-sm text-zinc-500">
                {report.report_date
                  ? `Report date: ${report.report_date}`
                  : `Uploaded: ${new Date(report.uploaded_at).toLocaleDateString()}`}
              </p>
            </div>

            <span className="shrink-0 text-sm font-medium text-teal-700">
              Open →
            </span>
          </div>
        </Link>
      ))}
    </div>
  ) : (
    <div className="mt-5 rounded-xl border border-dashed border-zinc-300 bg-zinc-50 p-6 text-center">
      <p className="text-sm text-zinc-600">
        No medical reports uploaded yet.
      </p>

      <Link
        href="/dashboard/medical-reports"
        className="mt-2 inline-block text-sm font-medium text-teal-700"
      >
        Upload your first report →
      </Link>
    </div>
  )}
</section>

<section className="mb-10 rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
  <div className="flex items-center justify-between gap-4">
    <div>
      <p className="text-sm font-medium text-teal-700">
        Current treatment
      </p>

      <h2 className="mt-1 text-xl font-semibold text-zinc-900">
        Active Medications
      </h2>
    </div>

    <Link
      href="/dashboard/medications"
      className="text-sm font-medium text-teal-700 hover:text-teal-800"
    >
      View all →
    </Link>
  </div>

  {activeMedications && activeMedications.length > 0 ? (
    <div className="mt-5 space-y-3">
      {activeMedications.map((medication) => (
        <div
          key={medication.id}
          className="rounded-xl border border-zinc-200 bg-zinc-50 p-4"
        >
          <p className="font-medium text-zinc-900">
            {medication.medicine_name}
          </p>

          {medication.dosage && (
            <p className="mt-1 text-sm text-zinc-600">
              Dosage: {medication.dosage}
            </p>
          )}

          {medication.frequency && (
            <p className="mt-1 text-sm text-zinc-600">
              Frequency: {medication.frequency}
            </p>
          )}
        </div>
      ))}
    </div>
  ) : (
    <div className="mt-5 rounded-xl border border-dashed border-zinc-300 bg-zinc-50 p-6 text-center">
      <p className="text-sm text-zinc-600">
        No active medications recorded.
      </p>

      <Link
        href="/dashboard/medications"
        className="mt-2 inline-block text-sm font-medium text-teal-700"
      >
        Manage medications →
      </Link>
    </div>
  )}
</section>

<section className="mb-10 rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
  <div className="flex items-center justify-between gap-4">
    <div>
      <p className="text-sm font-medium text-teal-700">
        Recent activity
      </p>

      <h2 className="mt-1 text-xl font-semibold text-zinc-900">
        Health Timeline
      </h2>
    </div>

    <Link
      href="/dashboard/health-timeline"
      className="text-sm font-medium text-teal-700 hover:text-teal-800"
    >
      View full timeline →
    </Link>
  </div>

  {timelinePreviewItems.length > 0 ? (
    <div className="mt-5 space-y-3">
      {timelinePreviewItems.map((item) => (
        <div
          key={item.id}
          className="rounded-xl border border-zinc-200 bg-zinc-50 p-4"
        >
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="font-medium text-zinc-900">{item.title}</p>

              <p className="mt-1 text-sm text-zinc-600">
                {item.type}
                {item.detail ? ` · ${item.detail}` : ""}
              </p>
            </div>

            <time className="shrink-0 text-sm text-zinc-500">
              {new Date(item.date).toLocaleDateString()}
            </time>
          </div>
        </div>
      ))}
    </div>
  ) : (
    <div className="mt-5 rounded-xl border border-dashed border-zinc-300 bg-zinc-50 p-6 text-center">
      <p className="text-sm text-zinc-600">
        Your recent health activity will appear here.
      </p>

      <Link
        href="/dashboard/health-timeline"
        className="mt-2 inline-block text-sm font-medium text-teal-700"
      >
        Open Health Timeline →
      </Link>
    </div>
  )}
</section>

        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {sections.map((section) => (
            <div
              key={section.title}
              className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm"
            >
              <h2 className="text-lg font-semibold text-zinc-900">
                {section.title}
              </h2>

              <p className="mt-2 text-sm leading-6 text-zinc-600">
                {section.description}
              </p>

              <Link
  href={section.href || "#"}
  className="mt-5 inline-block text-sm font-medium text-teal-700"
>
  Open →
</Link>
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}