import type {
    MonitoringSchedule,
    PatientObservation,
  } from "./types";
  
  export type ScheduleStatus =
    | "COMPLETED"
    | "DUE"
    | "OVERDUE"
    | "UPCOMING"
    | "DISABLED";
  
  export interface ScheduleOccurrence {
    schedule: MonitoringSchedule;
    scheduledAt: string;
    status: ScheduleStatus;
    observation?: PatientObservation;
  }
  
  const OVERDUE_GRACE_MINUTES = 60;
  
  function sameObservationType(
    observation: PatientObservation,
    schedule: MonitoringSchedule
  ) {
    return (
      observation.observation_type ===
      schedule.observation_type
    );
  }
  
  function isWithinWindow(
    observation: PatientObservation,
    scheduledAt: Date
  ) {
    const observationTime = new Date(
      observation.recorded_at
    ).getTime();
  
    const scheduledTime = scheduledAt.getTime();
  
    const difference = Math.abs(
      observationTime - scheduledTime
    );
  
    return difference <= 60 * 60 * 1000;
  }
  
  function buildIntervalOccurrences(
    schedule: MonitoringSchedule,
    from: Date,
    to: Date
  ): Date[] {
    const occurrences: Date[] = [];
  
    if (
      !schedule.frequency_minutes ||
      schedule.frequency_minutes <= 0
    ) {
      return occurrences;
    }
  
    const start = new Date(schedule.start_at);
  
    const frequencyMs =
      schedule.frequency_minutes * 60 * 1000;
  
    let current = new Date(start);
  
    if (current < from) {
      const elapsed =
        from.getTime() - start.getTime();
  
      const intervals = Math.floor(
        elapsed / frequencyMs
      );
  
      current = new Date(
        start.getTime() +
          intervals * frequencyMs
      );
    }
  
    while (current <= to) {
      if (current >= from) {
        occurrences.push(new Date(current));
      }
  
      current = new Date(
        current.getTime() + frequencyMs
      );
    }
  
    return occurrences;
  }
  
  function buildDailyOccurrences(
    schedule: MonitoringSchedule,
    from: Date,
    to: Date
  ): Date[] {
    const occurrences: Date[] = [];
  
    const targetTimes =
      Array.isArray(schedule.target_times)
        ? schedule.target_times
        : [];
  
    if (targetTimes.length === 0) {
      return occurrences;
    }
  
    const currentDay = new Date(from);
  
    currentDay.setHours(0, 0, 0, 0);
  
    while (currentDay <= to) {
      for (const target of targetTimes) {
        if (
          typeof target !== "string" ||
          !/^\d{2}:\d{2}$/.test(target)
        ) {
          continue;
        }
  
        const [hours, minutes] =
          target.split(":").map(Number);
  
        const occurrence = new Date(currentDay);
  
        occurrence.setHours(
          hours,
          minutes,
          0,
          0
        );
  
        if (
          occurrence >= from &&
          occurrence <= to
        ) {
          occurrences.push(occurrence);
        }
      }
  
      currentDay.setDate(
        currentDay.getDate() + 1
      );
    }
  
    return occurrences;
  }
  
  export function getScheduleOccurrences(
    schedules: MonitoringSchedule[],
    observations: PatientObservation[],
    from: Date,
    to: Date
  ): ScheduleOccurrence[] {
    const allOccurrences: ScheduleOccurrence[] = [];
  
    for (const schedule of schedules) {
      if (!schedule.enabled) {
        continue;
      }
  
      const scheduleStart = new Date(schedule.start_at);
  
      const scheduleEnd = schedule.end_at
        ? new Date(schedule.end_at)
        : null;
  
      const effectiveFrom =
        from > scheduleStart
          ? from
          : scheduleStart;
  
      const effectiveTo =
        scheduleEnd && scheduleEnd < to
          ? scheduleEnd
          : to;
  
      if (effectiveFrom > effectiveTo) {
        continue;
      }
  
      let occurrenceTimes: Date[] = [];
  
      switch (schedule.schedule_type) {
        case "INTERVAL":
          occurrenceTimes = buildIntervalOccurrences(
            schedule,
            effectiveFrom,
            effectiveTo
          );
          break;
  
        case "DAILY":
        case "CUSTOM":
          occurrenceTimes = buildDailyOccurrences(
            schedule,
            effectiveFrom,
            effectiveTo
          );
          break;
  
        default:
          // BEFORE_MEAL and AFTER_MEAL are event-driven
          // and will be handled when meal events are added.
          occurrenceTimes = [];
      }
  
      const now = new Date();
  
      const scheduleOccurrences = occurrenceTimes.map(
        (scheduledAt) => {
          const matchingObservation =
            observations.find(
              (observation) =>
                sameObservationType(
                  observation,
                  schedule
                ) &&
                isWithinWindow(
                  observation,
                  scheduledAt
                )
            );
  
          let status: ScheduleStatus;
  
          if (matchingObservation) {
            status = "COMPLETED";
          } else if (scheduledAt > now) {
            status = "UPCOMING";
          } else if (
            now.getTime() -
              scheduledAt.getTime() >
            OVERDUE_GRACE_MINUTES * 60 * 1000
          ) {
            status = "OVERDUE";
          } else {
            status = "DUE";
          }
  
          return {
            schedule,
            scheduledAt: scheduledAt.toISOString(),
            status,
            observation: matchingObservation,
          };
        }
      );
  
      allOccurrences.push(...scheduleOccurrences);
    }
  
    return allOccurrences.sort(
      (a, b) =>
        new Date(a.scheduledAt).getTime() -
        new Date(b.scheduledAt).getTime()
    );
  }
  
  export function getScheduleSummary(
    occurrences: ScheduleOccurrence[]
  ) {
    return {
      total: occurrences.length,
      completed: occurrences.filter(
        (item) => item.status === "COMPLETED"
      ).length,
      due: occurrences.filter(
        (item) => item.status === "DUE"
      ).length,
      overdue: occurrences.filter(
        (item) => item.status === "OVERDUE"
      ).length,
      upcoming: occurrences.filter(
        (item) => item.status === "UPCOMING"
      ).length,
    };
  }