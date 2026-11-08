/** Simple adult screening thresholds that highlight readings a nurse should double-check.
 *  These are prompts, not diagnoses. Children and special cases need clinical judgement. */
export type Vitals = { temperature_c: number | null; heart_rate: number | null; bp_systolic: number | null; bp_diastolic: number | null; oxygen_pct: number | null; respiratory_rate: number | null };

export function abnormal(v: Vitals) {
  return {
    temperature_c: v.temperature_c != null && (v.temperature_c >= 38 || v.temperature_c < 35.5),
    heart_rate: v.heart_rate != null && (v.heart_rate > 100 || v.heart_rate < 50),
    bp: (v.bp_systolic != null && (v.bp_systolic >= 140 || v.bp_systolic < 90)) || (v.bp_diastolic != null && v.bp_diastolic >= 90),
    oxygen_pct: v.oxygen_pct != null && v.oxygen_pct < 94,
    respiratory_rate: v.respiratory_rate != null && (v.respiratory_rate > 20 || v.respiratory_rate < 12),
  };
}
