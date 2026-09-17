/**
 * Date and Time utilities for Indian Standard Time (IST - UTC+05:30)
 */

/**
 * Format any date input into Indian Standard Time (IST) string.
 * Example: "17 Sep 2026, 06:13 PM"
 */
export function formatIST(
  dateInput?: string | number | Date | null,
  options?: {
    timeOnly?: boolean;
    dateOnly?: boolean;
    includeSeconds?: boolean;
    showTimezoneSuffix?: boolean;
  }
): string {
  if (!dateInput) return '—';
  try {
    const d = new Date(dateInput);
    if (isNaN(d.getTime())) return '—';

    const suffix = options?.showTimezoneSuffix ? ' IST' : '';

    if (options?.timeOnly) {
      return (
        d.toLocaleTimeString('en-IN', {
          timeZone: 'Asia/Kolkata',
          hour: '2-digit',
          minute: '2-digit',
          second: options.includeSeconds ? '2-digit' : undefined,
          hour12: true,
        }) + suffix
      );
    }

    if (options?.dateOnly) {
      return d.toLocaleDateString('en-IN', {
        timeZone: 'Asia/Kolkata',
        day: '2-digit',
        month: 'short',
        year: 'numeric',
      });
    }

    return (
      d.toLocaleString('en-IN', {
        timeZone: 'Asia/Kolkata',
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: options?.includeSeconds ? '2-digit' : undefined,
        hour12: true,
      }) + suffix
    );
  } catch {
    return '—';
  }
}

/**
 * Returns YYYY-MM-DD string strictly in Indian Standard Time (Asia/Kolkata)
 */
export function getISTDateString(dateInput?: string | number | Date | null): string {
  if (!dateInput) return '';
  try {
    const d = new Date(dateInput);
    if (isNaN(d.getTime())) return '';
    return new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Asia/Kolkata',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).format(d);
  } catch {
    return '';
  }
}

/**
 * Checks if a given timestamp falls on today in Indian Standard Time (Asia/Kolkata)
 */
export function isTodayIST(dateInput?: string | number | Date | null): boolean {
  if (!dateInput) return false;
  const todayIST = getISTDateString(new Date());
  return getISTDateString(dateInput) === todayIST;
}
