/** Month-level overlap validation; use only for clear employment date intervals. */
export type YearMonth = { year: number; month: number };
export type WorkInterval = { start: YearMonth; end: YearMonth | null };
export function monthIndex(value: YearMonth): number | null {
  if (!Number.isInteger(value.year) || value.year < 1950 || value.year > 2100 ||
      !Number.isInteger(value.month) || value.month < 1 || value.month > 12) return null;
  return value.year * 12 + value.month - 1;
}
export function documentedExperienceMonths(intervals: readonly WorkInterval[], asOf: YearMonth): number | null {
  const current = monthIndex(asOf);
  if (current === null || !intervals.length || intervals.length > 40) return null;
  const ranges: Array<[number, number]> = [];
  for (const interval of intervals) {
    const start = monthIndex(interval.start), end = interval.end ? monthIndex(interval.end) : current;
    // Month-end is exclusive. Unknown partial dates must not be approximated here.
    if (start === null || end === null || end < start || end > current || start > current) return null;
    ranges.push([start, end]);
  }
  ranges.sort((a, b) => a[0] - b[0]);
  let total = 0;
  let [lo, hi] = ranges[0];
  for (const [start, end] of ranges.slice(1)) {
    if (start <= hi) hi = Math.max(hi, end);
    else { total += hi - lo; lo = start; hi = end; }
  }
  total += hi - lo;
  return total <= 720 ? total : null;
}
