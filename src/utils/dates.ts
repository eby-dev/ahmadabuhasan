/**
 * Date formatting utilities. All formatters are locale-locked to en-US
 * (SITE.locale = 'en'). If localization is added later, take locale as arg.
 */

const MONTH_YEAR = new Intl.DateTimeFormat('en-US', {
  month: 'short',
  year: 'numeric',
});

const FULL_DATE = new Intl.DateTimeFormat('en-US', {
  month: 'long',
  day: 'numeric',
  year: 'numeric',
});

export function formatMonthYear(date: Date): string {
  return MONTH_YEAR.format(date);
}

export function formatFullDate(date: Date): string {
  return FULL_DATE.format(date);
}

/**
 * Renders a role tenure. When endDate is null → "Present".
 *   formatDateRange(new Date('2024-11-01'), null)     → "Nov 2024 — Present"
 *   formatDateRange(new Date('2023-07-01'), new Date('2024-10-31')) → "Jul 2023 — Oct 2024"
 */
export function formatDateRange(startDate: Date, endDate: Date | null): string {
  const start = MONTH_YEAR.format(startDate);
  const end = endDate === null ? 'Present' : MONTH_YEAR.format(endDate);
  return `${start} — ${end}`;
}

/**
 * ISO 8601 (YYYY-MM-DD) — used for `<time datetime="...">` machine-readable form.
 */
export function toISODate(date: Date): string {
  return date.toISOString().slice(0, 10);
}
