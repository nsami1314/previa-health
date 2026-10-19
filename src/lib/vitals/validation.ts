import { ObservationInput, ObservationType } from "./types";

export interface ValidationResult {
  valid: boolean;
  error?: string;
}

const isFiniteNumber = (value: unknown): value is number =>
  typeof value === "number" && Number.isFinite(value);

export function validateObservationByType(
  input: ObservationInput
): ValidationResult {
  if (!input.observation_type) {
    return {
      valid: false,
      error: "Observation type is required.",
    };
  }

  if (!isFiniteNumber(input.value)) {
    return {
      valid: false,
      error: "A valid numeric value is required.",
    };
  }

  const value = input.value;

  switch (input.observation_type as ObservationType) {
    case "BLOOD_PRESSURE": {
      if (!isFiniteNumber(input.secondary_value)) {
        return {
          valid: false,
          error:
            "Both systolic and diastolic blood pressure values are required.",
        };
      }

      const diastolic = input.secondary_value;

      if (value < 20 || value > 300) {
        return {
          valid: false,
          error:
            "Systolic blood pressure value is outside the allowed data range.",
        };
      }

      if (diastolic < 10 || diastolic > 200) {
        return {
          valid: false,
          error:
            "Diastolic blood pressure value is outside the allowed data range.",
        };
      }

      if (value <= diastolic) {
        return {
          valid: false,
          error: "Systolic blood pressure must be greater than diastolic.",
        };
      }

      break;
    }

    case "HEART_RATE": {
      if (value < 1 || value > 300) {
        return {
          valid: false,
          error: "Heart rate must be between 1 and 300 bpm.",
        };
      }

      break;
    }

    case "SPO2": {
      if (value < 0 || value > 100) {
        return {
          valid: false,
          error: "SpO2 must be between 0 and 100%.",
        };
      }

      break;
    }

    case "RESPIRATORY_RATE": {
      if (value < 1 || value > 100) {
        return {
          valid: false,
          error: "Respiratory rate must be between 1 and 100 breaths/min.",
        };
      }

      break;
    }

    case "TEMPERATURE": {
      const unit = input.unit?.toLowerCase();

      if (unit === "°f" || unit === "f") {
        if (value < 77 || value > 113) {
          return {
            valid: false,
            error: "Temperature is outside the allowed data range.",
          };
        }
      } else {
        if (value < 25 || value > 45) {
          return {
            valid: false,
            error: "Temperature is outside the allowed data range.",
          };
        }
      }

      break;
    }

    case "BLOOD_GLUCOSE": {
      if (value < 1 || value > 1000) {
        return {
          valid: false,
          error: "Blood glucose value is outside the allowed data range.",
        };
      }

      break;
    }

    case "WEIGHT": {
      if (value <= 0 || value > 500) {
        return {
          valid: false,
          error:
            "Weight must be greater than 0 and within the allowed data range.",
        };
      }

      break;
    }

    case "PAIN": {
      if (value < 0 || value > 10) {
        return {
          valid: false,
          error: "Pain score must be between 0 and 10.",
        };
      }

      break;
    }

    default:
      return {
        valid: false,
        error: "Unsupported observation type.",
      };
  }

  return { valid: true };
}