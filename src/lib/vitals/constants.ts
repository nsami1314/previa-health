import type {
    CareEventType,
    ObservationSourceType,
    ObservationType,
  } from "./types";
  
  export const OBSERVATION_TYPES: Array<{
    value: ObservationType;
    label: string;
    unit: string;
    supportsSecondaryValue?: boolean;
  }> = [
    {
      value: "BLOOD_PRESSURE",
      label: "Blood Pressure",
      unit: "mmHg",
      supportsSecondaryValue: true,
    },
    {
      value: "HEART_RATE",
      label: "Heart Rate",
      unit: "bpm",
    },
    {
      value: "SPO2",
      label: "SpO₂",
      unit: "%",
    },
    {
      value: "RESPIRATORY_RATE",
      label: "Respiratory Rate",
      unit: "breaths/min",
    },
    {
      value: "TEMPERATURE",
      label: "Temperature",
      unit: "°C",
    },
    {
      value: "BLOOD_GLUCOSE",
      label: "Blood Glucose",
      unit: "mg/dL",
    },
    {
      value: "WEIGHT",
      label: "Weight",
      unit: "kg",
    },
    {
      value: "PAIN",
      label: "Pain",
      unit: "/10",
    },
  ];
  
  export const OBSERVATION_SOURCE_TYPES: Array<{
    value: ObservationSourceType;
    label: string;
  }> = [
    {
      value: "MANUAL",
      label: "Manual",
    },
    {
      value: "CAREGIVER",
      label: "Caregiver",
    },
    {
      value: "NURSE",
      label: "Nurse",
    },
    {
      value: "DOCTOR",
      label: "Doctor",
    },
    {
      value: "DEVICE",
      label: "Device",
    },
    {
      value: "HOSPITAL_SYSTEM",
      label: "Hospital System",
    },
    {
      value: "IMPORT",
      label: "Import",
    },
    {
      value: "API",
      label: "API",
    },
  ];
  
  export const CARE_EVENT_TYPES: Array<{
    value: CareEventType;
    label: string;
  }> = [
    {
      value: "MEDICATION_GIVEN",
      label: "Medication Given",
    },
    {
      value: "INJECTION_GIVEN",
      label: "Injection Given",
    },
    {
      value: "OXYGEN_STARTED",
      label: "Oxygen Started",
    },
    {
      value: "OXYGEN_CHANGED",
      label: "Oxygen Changed",
    },
    {
      value: "OXYGEN_STOPPED",
      label: "Oxygen Stopped",
    },
    {
      value: "REPOSITIONING",
      label: "Repositioning",
    },
    {
      value: "DRESSING_CHANGE",
      label: "Dressing Change",
    },
    {
      value: "PHYSIOTHERAPY",
      label: "Physiotherapy",
    },
    {
      value: "FEEDING",
      label: "Feeding",
    },
    {
      value: "CATHETER_CARE",
      label: "Catheter Care",
    },
    {
      value: "FLUID_INTAKE",
      label: "Fluid Intake",
    },
    {
      value: "URINE_OUTPUT",
      label: "Urine Output",
    },
    {
      value: "STOOL",
      label: "Stool",
    },
    {
      value: "VOMITING",
      label: "Vomiting",
    },
    {
      value: "DRAIN_OUTPUT",
      label: "Drain Output",
    },
    {
      value: "OTHER",
      label: "Other",
    },
  ];