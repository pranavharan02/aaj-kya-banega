/** Parse a YYYY-MM-DD string into a local Date at noon (avoids all TZ edge cases) */
function parseLocalDate(str: string): Date {
  const [y, m, d] = str.split('-').map(Number)
  return new Date(y, m - 1, d, 12, 0, 0)
}

/** Get Monday of the week containing the given date */
export function getMonday(date: Date = new Date()): Date {
  const d = new Date(date.getFullYear(), date.getMonth(), date.getDate(), 12, 0, 0)
  const day = d.getDay() // 0=Sun, 1=Mon, ..., 6=Sat
  const diff = day === 0 ? -6 : 1 - day // days to subtract to reach Monday
  d.setDate(d.getDate() + diff)
  return d
}

/** Format a Date to YYYY-MM-DD using local components (never UTC) */
export function formatDate(date: Date): string {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

export function formatDateDisplay(dateStr: string): string {
  const d = parseLocalDate(dateStr)
  return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })
}

export function getWeekDates(mondayStr: string): string[] {
  const monday = parseLocalDate(mondayStr)
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(monday)
    d.setDate(d.getDate() + i)
    return formatDate(d)
  })
}

export function getWeekLabel(mondayStr: string): string {
  const monday = parseLocalDate(mondayStr)
  const sunday = new Date(monday)
  sunday.setDate(sunday.getDate() + 6)
  const fmt = (d: Date) => d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })
  return `${fmt(monday)} – ${fmt(sunday)}`
}

/** Shift a week-start date by N weeks, always re-anchoring to Monday */
export function shiftWeekStart(currentStart: string, delta: number): string {
  const d = parseLocalDate(currentStart)
  d.setDate(d.getDate() + delta * 7)
  // Re-anchor to Monday in case of any drift
  const monday = getMonday(d)
  return formatDate(monday)
}
