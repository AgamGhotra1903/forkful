import React from 'react';
import { TileLayer } from 'react-leaflet';

interface AppTileLayerProps {
  maxZoom?: number;
}

/**
 * Universal basemap TileLayer for Forkful.
 *
 * - If VITE_CARTO_API_KEY is configured in frontend/.env, it loads official CARTO
 *   Dark Matter tiles authenticated with `?key=...`.
 * - Otherwise, it falls back to OpenStreetMap with a dark-theme CSS filter,
 *   which is 100% free, requires NO API key, and has ZERO watermarks.
 */
export const AppTileLayer: React.FC<AppTileLayerProps> = ({ maxZoom = 19 }) => {
  const cartoApiKey = (import.meta.env.VITE_CARTO_API_KEY || '').trim();

  if (cartoApiKey && !cartoApiKey.startsWith('your_')) {
    return (
      <TileLayer
        url={`https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png?key=${encodeURIComponent(cartoApiKey)}`}
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>'
        subdomains="abcd"
        maxZoom={maxZoom}
      />
    );
  }

  return (
    <TileLayer
      url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
      subdomains="abc"
      maxZoom={maxZoom}
      className="dark-tile-layer"
    />
  );
};

export default AppTileLayer;
