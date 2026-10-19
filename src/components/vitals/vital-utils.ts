export function getVitalDecimals(type: string): number {
    return type === "TEMPERATURE" || type === "WEIGHT" ? 1 : 0;
  }
  
  export function formatVitalValue(
    value: number | null | undefined,
    decimals = 0
  ): string {
    if (value === null || value === undefined || Number.isNaN(value)) {
      return "—";
    }
  
    return value.toFixed(decimals);
  }
  
  export function formatVitalTrendLabel(trend: string): string {
    switch (trend) {
      case "RISING":
        return "Rising";
      case "FALLING":
        return "Falling";
      case "STABLE":
        return "Stable";
      default:
        return "Limited data";
    }
  }
  
  export function getVitalTrendTone(trend: string): string {
    switch (trend) {
      case "STABLE":
        return "previa-status-stable";
      case "RISING":
        return "previa-status-attention";
      case "FALLING":
        return "previa-status-info";
      default:
        return "previa-status-info";
    }
  }
  
  export function getVitalTrendIcon(trend: string): string {
    if (trend === "RISING") return "↗";
    if (trend === "FALLING") return "↘";
    if (trend === "STABLE") return "→";
  
    return "•";
  }
  
  export function formatVitalDateTime(value: string): string {
    return new Date(value).toLocaleString([], {
      day: "2-digit",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
    });
  }
  
  export function formatBloodPressure(
    systolic: number | null | undefined,
    diastolic: number | null | undefined
  ): string {
    if (
      systolic === null ||
      systolic === undefined ||
      diastolic === null ||
      diastolic === undefined
    ) {
      return "—";
    }
  
    return `${formatVitalValue(systolic, 0)}/${formatVitalValue(
      diastolic,
      0
    )}`;
  }