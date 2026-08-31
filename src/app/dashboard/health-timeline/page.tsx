"use client";

import { useEffect, useState } from "react";
import { useAuth, useUser } from "@clerk/nextjs";
import { createSupabaseClient } from "@/lib/supabase";

type TimelineItem = {
  id: string;
  type: "Condition" | "Goal" | "Insight" | "Medication" | "Medical Report";
  title: string;
  detail: string | null;
  date: string;
};

type TimelineFilter = "All" | TimelineItem["type"];

const timelineFilters: TimelineFilter[] = [
  "All",
  "Condition",
  "Goal",
  "Insight",
  "Medication",
  "Medical Report",
];

export default function HealthTimelinePage() {
  const { getToken } = useAuth();
  const { user } = useUser();

  const [timelineItems, setTimelineItems] = useState<TimelineItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [selectedFilter, setSelectedFilter] =
  useState<TimelineFilter>("All");

  useEffect(() => {
    async function loadTimeline() {
      if (!user) {
        return;
      }

      try {
        const token = await getToken();

        if (!token) {
          setLoadError("Your session has expired. Please sign in again.");
          return;
        }

        const supabase = createSupabaseClient(token);

        const [
          conditionsResult,
          goalsResult,
          insightsResult,
          medicationsResult,
          reportsResult,
        ] = await Promise.all([
          supabase
            .from("health_conditions")
            .select("id, condition_name, status, diagnosed_date, created_at")
            .eq("user_id", user.id),

          supabase
            .from("health_goals")
            .select("id, title, status, target_date, created_at")
            .eq("user_id", user.id),

          supabase
            .from("health_insights")
            .select("id, title, category, insight_date, created_at")
            .eq("user_id", user.id),

          supabase
            .from("medications")
            .select("id, medicine_name, dosage, frequency, created_at")
            .eq("user_id", user.id),

          supabase
            .from("medical_reports")
            .select(
              "id, original_file_name, report_type, report_date, uploaded_at"
            )
            .eq("user_id", user.id),
        ]);

        if (
          conditionsResult.error ||
          goalsResult.error ||
          insightsResult.error ||
          medicationsResult.error ||
          reportsResult.error
        ) {
          console.error("Failed to load health timeline:", {
            conditions: conditionsResult.error,
            goals: goalsResult.error,
            insights: insightsResult.error,
            medications: medicationsResult.error,
            reports: reportsResult.error,
          });

          setLoadError("Unable to load your health timeline. Please try again.");
          return;
        }

        const conditions: TimelineItem[] = (conditionsResult.data ?? []).map(
          (condition) => ({
            id: `condition-${condition.id}`,
            type: "Condition",
            title: condition.condition_name,
            detail: condition.status ? `Status: ${condition.status}` : null,
            date: condition.diagnosed_date || condition.created_at,
          })
        );

        const goals: TimelineItem[] = (goalsResult.data ?? []).map((goal) => ({
          id: `goal-${goal.id}`,
          type: "Goal",
          title: goal.title,
          detail: goal.status ? `Status: ${goal.status}` : null,
          date: goal.target_date || goal.created_at,
        }));

        const insights: TimelineItem[] = (insightsResult.data ?? []).map(
          (insight) => ({
            id: `insight-${insight.id}`,
            type: "Insight",
            title: insight.title,
            detail: insight.category
              ? `Category: ${insight.category}`
              : null,
            date: insight.insight_date || insight.created_at,
          })
        );

        const medications: TimelineItem[] = (medicationsResult.data ?? []).map(
          (medication) => ({
            id: `medication-${medication.id}`,
            type: "Medication",
            title: medication.medicine_name,
            detail:
              [medication.dosage, medication.frequency]
                .filter(Boolean)
                .join(" · ") || null,
            date: medication.created_at,
          })
        );

        const reports: TimelineItem[] = (reportsResult.data ?? []).map(
          (report) => ({
            id: `report-${report.id}`,
            type: "Medical Report",
            title:
              report.original_file_name ||
              report.report_type ||
              "Medical Report",
            detail: report.report_type
              ? `Type: ${report.report_type}`
              : null,
            date: report.report_date || report.uploaded_at,
          })
        );

        const items = [
          ...conditions,
          ...goals,
          ...insights,
          ...medications,
          ...reports,
        ].sort(
          (firstItem, secondItem) =>
            new Date(secondItem.date).getTime() -
            new Date(firstItem.date).getTime()
        );

        setTimelineItems(items);
      } catch (error) {
        console.error("Failed to load health timeline:", error);
        setLoadError("Unable to load your health timeline. Please try again.");
      } finally {
        setLoading(false);
      }
    }

    loadTimeline();
  }, [user, getToken]);

  const filteredTimelineItems =
  selectedFilter === "All"
    ? timelineItems
    : timelineItems.filter((item) => item.type === selectedFilter);

  return (
    <main className="min-h-screen bg-zinc-50 px-6 py-10">
      <div className="mx-auto max-w-4xl">
        <div className="mb-8">
          <p className="text-sm font-medium text-teal-700">
            Previa Health
          </p>

          <h1 className="mt-2 text-3xl font-semibold tracking-tight text-zinc-900">
            Health Timeline
          </h1>

          <p className="mt-3 text-zinc-600">
            Review your health record in one chronological view.
          </p>
        </div>

        <section className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
          <div>
            <h2 className="text-xl font-semibold text-zinc-900">
              Your Timeline
            </h2>

            <p className="mt-1 text-sm text-zinc-500">
              {user?.fullName || "Your health journey"}
            </p>
          </div>

          <div className="mt-5 flex flex-wrap gap-2">
  {timelineFilters.map((filter) => (
    <button
      key={filter}
      type="button"
      onClick={() => setSelectedFilter(filter)}
      className={`rounded-lg px-3 py-1.5 text-sm font-medium transition ${
        selectedFilter === filter
          ? "bg-teal-700 text-white"
          : "border border-zinc-300 bg-white text-zinc-700 hover:bg-zinc-50"
      }`}
    >
      {filter}
    </button>
  ))}
</div>

          {loading ? (
            <p className="mt-6 text-sm text-zinc-500">
              Loading timeline...
            </p>
          ) : loadError ? (
            <p
              role="alert"
              className="mt-6 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700"
            >
              {loadError}
            </p>
          ) : filteredTimelineItems.length > 0 ? (
            <div className="mt-6 space-y-3">
              {filteredTimelineItems.map((item) => (
                <div
                  key={item.id}
                  className="rounded-xl border border-zinc-200 p-4"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="font-medium text-zinc-900">
                        {item.title}
                      </p>

                      <p className="mt-1 text-sm text-zinc-600">
                        {item.type}
                      </p>

                      {item.detail && (
                        <p className="mt-1 text-sm text-zinc-600">
                          {item.detail}
                        </p>
                      )}
                    </div>

                    <time className="shrink-0 text-sm text-zinc-500">
                      {new Date(item.date).toLocaleDateString()}
                    </time>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="mt-6 rounded-xl border border-dashed border-zinc-300 bg-zinc-50 p-6 text-center">
              <p className="text-sm text-zinc-600">
              {selectedFilter === "All"
  ? "No health records have been added yet."
  : `No ${selectedFilter.toLowerCase()} records match this filter.`}
              </p>

              <p className="mt-1 text-xs text-zinc-500">
                Add information in your health modules to build your timeline.
              </p>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}