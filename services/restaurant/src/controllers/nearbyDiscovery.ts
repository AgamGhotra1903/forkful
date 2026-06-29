/**
 * OSM Nearby Restaurant Discovery Controller
 * GET /api/v1/restaurant/nearby-discovery?lat=&lng=&radius=5000
 *
 * Queries Overpass API for food amenities near the user that are NOT
 * already registered on Forkful. Returns discovery cards for the frontend.
 */

import type { Request, Response } from "express";
import Restaurant from "../models/Restaurant.js";

interface OSMNode {
  id: number;
  lat: number;
  lon: number;
  tags: Record<string, string>;
}

interface DiscoveryCard {
  osmId: string;
  name: string;
  amenity: string;
  lat: number;
  lng: number;
  address: string;
  isRegistered: false;
  cuisine?: string;
  openingHours?: string;
}

const AMENITY_EMOJI: Record<string, string> = {
  restaurant: "🍽️",
  cafe: "☕",
  fast_food: "🍔",
  bar: "🍺",
  food_court: "🏬",
};

export const nearbyDiscovery = async (req: Request, res: Response) => {
  try {
    const lat = parseFloat(req.query.lat as string);
    const lng = parseFloat(req.query.lng as string);
    const radius = parseInt(req.query.radius as string) || 5000;

    if (isNaN(lat) || isNaN(lng)) {
      return res.status(400).json({ message: "lat and lng are required" });
    }

    // 1. Fetch registered Forkful restaurants nearby
    const registered = await Restaurant.find({
      autoLocation: {
        $near: {
          $geometry: { type: "Point", coordinates: [lng, lat] },
          $maxDistance: radius,
        },
      },
    });
    const registeredNames = new Set(
      registered.map((r) => r.name.toLowerCase().trim())
    );

    // 2. Query Overpass API
    const overpassQuery = `
      [out:json][timeout:8];
      (
        node["amenity"~"restaurant|cafe|fast_food|bar|food_court"](around:${radius},${lat},${lng});
      );
      out body;
    `.trim();

    let osmNodes: OSMNode[] = [];
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 8000);
      const overpassRes = await fetch(
        "https://overpass-api.de/api/interpreter",
        {
          method: "POST",
          body: overpassQuery,
          headers: { "Content-Type": "text/plain" },
          signal: controller.signal,
        }
      );
      clearTimeout(timeout);

      if (overpassRes.ok) {
        const overpassData = await overpassRes.json() as any;
        osmNodes = (overpassData.elements || []) as OSMNode[];
      }
    } catch (osmErr: any) {
      if (osmErr.name === "AbortError") {
        console.warn("Overpass API timed out — returning empty discovery");
      } else {
        console.error("Overpass API error:", osmErr);
      }
    }

    // 3. Filter out already-registered venues and those without names
    const discoveries: DiscoveryCard[] = osmNodes
      .filter((node) => {
        const name = node.tags?.name;
        return (
          name &&
          name.length > 1 &&
          !registeredNames.has(name.toLowerCase().trim())
        );
      })
      .slice(0, 12) // cap at 12 cards
      .map((node): DiscoveryCard => {
        const tags = node.tags || {};
        const amenity = tags.amenity || "restaurant";
        const emoji = AMENITY_EMOJI[amenity] || "🍽️";
        const card: DiscoveryCard = {
          osmId: String(node.id),
          name: tags.name || "Unknown Place",
          amenity: `${emoji} ${amenity.replace(/_/g, " ")}`,
          lat: node.lat,
          lng: node.lon,
          address: tags["addr:street"]
            ? `${tags["addr:housenumber"] ?? ""} ${tags["addr:street"]}, ${tags["addr:city"] ?? ""}`.trim()
            : "Address not available",
          isRegistered: false,
        };
        if (tags.cuisine) card.cuisine = tags.cuisine;
        if (tags.opening_hours) card.openingHours = tags.opening_hours;
        return card;
      });

    return res.json({ discoveries, count: discoveries.length });
  } catch (error) {
    console.error("Nearby discovery error:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};
