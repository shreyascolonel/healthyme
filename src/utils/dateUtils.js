// Utility functions for robust local date handling without UTC distortion

/**
 * Returns YYYY-MM-DD in user's local timezone.
 */
export function getLocalDateString(d = new Date()) {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Adds or subtracts days from a YYYY-MM-DD string cleanly in local calendar time.
 */
export function shiftDateString(dateStr, offsetDays) {
  if (!dateStr) return getLocalDateString();
  const [y, m, d] = dateStr.split('-').map(Number);
  const date = new Date(y, m - 1, d);
  date.setDate(date.getDate() + offsetDays);
  return getLocalDateString(date);
}

/**
 * Formats a YYYY-MM-DD string into a display date label.
 * E.g., "Mon, 27 Oct"
 */
export function formatDisplayDate(dateStr) {
  if (!dateStr) return '';
  const [y, m, d] = dateStr.split('-').map(Number);
  const date = new Date(y, m - 1, d);
  return date.toLocaleDateString('en-US', {
    weekday: 'short',
    day: 'numeric',
    month: 'short'
  });
}
