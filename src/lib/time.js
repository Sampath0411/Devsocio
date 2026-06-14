// Format any timestamp shape into a short relative label ("now", "5m", "2h").
// Handles Firestore Timestamp ({seconds,nanoseconds} or .toDate()), Date,
// numeric epoch, ISO string, or our legacy mock strings ("2h") — and null.
export function timeAgo(value) {
  if (value == null) return ''
  if (typeof value === 'string') return value // already a label (e.g. "now", "2h")

  let date
  if (typeof value.toDate === 'function') date = value.toDate()
  else if (typeof value.seconds === 'number') date = new Date(value.seconds * 1000)
  else if (value instanceof Date) date = value
  else if (typeof value === 'number') date = new Date(value)
  else return ''

  const secs = Math.floor((Date.now() - date.getTime()) / 1000)
  if (secs < 45) return 'now'
  const mins = Math.floor(secs / 60)
  if (mins < 60) return `${mins}m`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h`
  const days = Math.floor(hrs / 24)
  if (days < 7) return `${days}d`
  return date.toLocaleDateString()
}
