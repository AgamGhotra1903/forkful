/**
 * Forkful — Dynamic Delivery Time Estimator
 *
 * Uses the haversine formula to calculate straight-line distance between
 * restaurant and customer, then converts it to a realistic delivery range
 * accounting for city traffic, road tortuosity, and food prep time.
 *
 * No external API key required.
 */

interface Coords {
  latitude: number;
  longitude: number;
}

/**
 * Haversine distance in kilometres between two lat/lng points.
 */
function haversineKm(a: Coords, b: Coords): number {
  const R = 6371; // Earth radius in km
  const dLat = ((b.latitude - a.latitude) * Math.PI) / 180;
  const dLon = ((b.longitude - a.longitude) * Math.PI) / 180;
  const lat1 = (a.latitude * Math.PI) / 180;
  const lat2 = (b.latitude * Math.PI) / 180;

  const x =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2;

  return R * 2 * Math.atan2(Math.sqrt(x), Math.sqrt(1 - x));
}

/**
 * Returns a human-readable delivery time range string, e.g. "22–30 min".
 *
 * Calculation:
 *  - straight-line km → road distance (×1.35 tortuosity factor)
 *  - average city speed: 22 km/h (conservative, accounts for stops & traffic)
 *  - prep buffer: 8–12 min
 *  - range spread: ±4 min
 *  - minimum shown: 15 min (can't be less regardless of proximity)
 *
 * Falls back to "30–45 min" when coordinates are unavailable.
 */
export function getDeliveryEstimate(
  restaurantCoords: Coords | null | undefined,
  customerCoords: Coords | null | undefined
): string {
  if (!restaurantCoords || !customerCoords) {
    return "30–45 min";
  }

  const straightLineKm = haversineKm(restaurantCoords, customerCoords);
  const roadKm = straightLineKm * 1.35; // road tortuosity factor
  const avgSpeedKmh = 22; // conservative city delivery speed
  const travelMinutes = (roadKm / avgSpeedKmh) * 60;

  const prepMin = 10; // avg restaurant prep time
  const totalMin = travelMinutes + prepMin;

  // Floor to nearest 5, with a minimum of 15 min
  const base = Math.max(15, Math.ceil(totalMin / 5) * 5);

  // Range: base to base+8 (accounts for real-world variance)
  const lo = base;
  const hi = base + 8;

  return `${lo}–${hi} min`;
}

/**
 * Deterministic fallback when no coords are available — uses the restaurant
 * ID's last character to generate a consistent (but still fake) range.
 * This replaces the old getMockDuration function.
 */
export function getFallbackEstimate(restaurantId: string): string {
  const seed = restaurantId ? restaurantId.charCodeAt(restaurantId.length - 1) % 20 : 10;
  const base = seed + 20; // 20–39 range
  return `${base}–${base + 8} min`;
}
