export type ObservationSourceType =
  | "MANUAL"
  | "CAREGIVER"
  | "NURSE"
  | "DOCTOR"
  | "DEVICE"
  | "HOSPITAL_SYSTEM"
  | "IMPORT"
  | "API";

export type CareEpisodeStatus =
  | "ACTIVE"
  | "COMPLETED"
  | "CANCELLED";

export type MonitoringScheduleType =
  | "INTERVAL"
  | "DAILY"
  | "WEEKLY"
  | "BEFORE_MEAL"
  | "AFTER_MEAL"
  | "CUSTOM";

export type ObservationType =
  | "BLOOD_PRESSURE"
  | "HEART_RATE"
  | "SPO2"
  | "RESPIRATORY_RATE"
  | "TEMPERATURE"
  | "BLOOD_GLUCOSE"
  | "WEIGHT"
  | "PAIN";

export type CareEventType =
  | "MEDICATION_GIVEN"
  | "INJECTION_GIVEN"
  | "OXYGEN_STARTED"
  | "OXYGEN_CHANGED"
  | "OXYGEN_STOPPED"
  | "REPOSITIONING"
  | "DRESSING_CHANGE"
  | "PHYSIOTHERAPY"
  | "FEEDING"
  | "CATHETER_CARE"
  | "FLUID_INTAKE"
  | "URINE_OUTPUT"
  | "STOOL"
  | "VOMITING"
  | "DRAIN_OUTPUT"
  | "OTHER";

export interface CareEpisode {
  id: string;
  user_id: string;
  episode_type: string;
  title: string;
  reason: string | null;
  start_at: string;
  end_at: string | null;
  monitoring_status: CareEpisodeStatus;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface PatientObservation {
  id: string;
  user_id: string;
  care_episode_id: string | null;
  observation_type: ObservationType | string;
  value: number | null;
  secondary_value: number | null;
  unit: string | null;
  recorded_at: string;
  source_type: ObservationSourceType;
  source_device_id: string | null;
  source_reference: string | null;
  recorded_by: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface MonitoringSchedule {
  id: string;
  user_id: string;
  care_episode_id: string | null;
  observation_type: ObservationType | string;
  frequency_minutes: number | null;
  schedule_type: MonitoringScheduleType;
  target_times: string[];
  enabled: boolean;
  start_at: string;
  end_at: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface CareEvent {
  id: string;
  user_id: string;
  care_episode_id: string | null;
  event_type: CareEventType | string;
  event_value: number | null;
  unit: string | null;
  event_text: string | null;
  occurred_at: string;
  source_type: ObservationSourceType;
  recorded_by: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface BloodPressureValue {
  systolic: number;
  diastolic: number;
}

export interface ObservationInput {
  observation_type: ObservationType;
  value: number;
  secondary_value?: number | null;
  unit: string;
  recorded_at?: string;
  source_type?: ObservationSourceType;
  source_device_id?: string | null;
  source_reference?: string | null;
  recorded_by?: string | null;
  notes?: string | null;
  care_episode_id?: string | null;
}

export interface CareEpisodeInput {
  title: string;
  episode_type?: string;
  reason?: string | null;
  start_at?: string;
  end_at?: string | null;
  monitoring_status?: CareEpisodeStatus;
  notes?: string | null;
}