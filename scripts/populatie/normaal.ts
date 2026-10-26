/*
 * Inverse van de standaardnormale verdeling (algoritme van Acklam, relatieve fout < 1,15e-9).
 * De coëfficiënten zijn wiskundige constanten van het algoritme, geen beleidsparameters.
 */

const A = [
  -39.69683028665376, 220.9460984245205, -275.9285104469687, 138.357751867269, -30.66479806614716,
  2.506628277459239,
] as const;
const B = [
  -54.47609879822406, 161.5858368580409, -155.6989798598866, 66.80131188771972, -13.28068155288572,
] as const;
const C = [
  -0.007784894002430293, -0.3223964580411365, -2.400758277161838, -2.549732539343734, 4.374664141464968,
  2.938163982698783,
] as const;
const D = [0.007784695709041462, 0.3224671290700398, 2.445134137142996, 3.754408661907416] as const;
const P_LAAG = 0.02425;

function staart(q: number): number {
  return (
    (((((C[0] * q + C[1]) * q + C[2]) * q + C[3]) * q + C[4]) * q + C[5]) /
    ((((D[0] * q + D[1]) * q + D[2]) * q + D[3]) * q + 1)
  );
}

export function inverseNormaal(p: number): number {
  if (p < P_LAAG) return staart(Math.sqrt(-2 * Math.log(p)));
  if (p > 1 - P_LAAG) return -staart(Math.sqrt(-2 * Math.log(1 - p)));
  const q = p - 0.5;
  const r = q * q;
  return (
    ((((((A[0] * r + A[1]) * r + A[2]) * r + A[3]) * r + A[4]) * r + A[5]) * q) /
    (((((B[0] * r + B[1]) * r + B[2]) * r + B[3]) * r + B[4]) * r + 1)
  );
}
