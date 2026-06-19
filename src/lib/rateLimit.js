const hits = new Map()

export function rateLimit(ip, maxPerMinute = 5) {
  const now = Date.now()
  const windowStart = now - 60_000
  const timestamps = (hits.get(ip) || []).filter(t => t > windowStart)
  timestamps.push(now)
  hits.set(ip, timestamps)

  // Prevent the map from growing unbounded
  if (hits.size > 5000) {
    for (const [key, times] of hits) {
      if (times.every(t => t < windowStart)) hits.delete(key)
    }
  }

  return timestamps.length <= maxPerMinute
}
