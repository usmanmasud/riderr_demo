'use client';
import { useEffect, useRef } from 'react';
import 'leaflet/dist/leaflet.css';

type Props = {
  pickup: string;
  destination: string;
  trackingCode: string;
  onClose: () => void;
};

async function geocode(address: string): Promise<[number, number] | null> {
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(address)}&limit=1`,
      { headers: { 'Accept-Language': 'en' } }
    );
    const data = await res.json();
    if (data[0]) return [parseFloat(data[0].lat), parseFloat(data[0].lon)];
    return null;
  } catch { return null; }
}

export default function MapModal({ pickup, destination, trackingCode, onClose }: Props) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstance = useRef<any>(null);

  useEffect(() => {
    if (!mapRef.current || mapInstance.current) return;

    (async () => {
      const L = (await import('leaflet')).default;

      // Fix default marker icons
      delete (L.Icon.Default.prototype as any)._getIconUrl;
      L.Icon.Default.mergeOptions({
        iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
        iconUrl:       'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
        shadowUrl:     'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
      });

      const map = L.map(mapRef.current!).setView([9.0579, 7.4951], 12); // Default: Abuja
      mapInstance.current = map;

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors',
      }).addTo(map);

      const [pickupCoords, destCoords] = await Promise.all([
        geocode(pickup),
        geocode(destination),
      ]);

      const bounds: [number, number][] = [];

      if (pickupCoords) {
        L.marker(pickupCoords, {
          icon: L.divIcon({
            html: `<div style="background:#10b981;color:white;padding:4px 8px;border-radius:6px;font-size:11px;font-weight:bold;white-space:nowrap">📍 Pickup</div>`,
            className: '', iconAnchor: [30, 10],
          }),
        }).addTo(map).bindPopup(`<b>Pickup</b><br>${pickup}`);
        bounds.push(pickupCoords);
      }

      if (destCoords) {
        L.marker(destCoords, {
          icon: L.divIcon({
            html: `<div style="background:#ef4444;color:white;padding:4px 8px;border-radius:6px;font-size:11px;font-weight:bold;white-space:nowrap">🏁 Destination</div>`,
            className: '', iconAnchor: [50, 10],
          }),
        }).addTo(map).bindPopup(`<b>Destination</b><br>${destination}`);
        bounds.push(destCoords);
      }

      if (bounds.length === 2) {
        map.fitBounds(bounds, { padding: [40, 40] });
        L.polyline(bounds, { color: '#6366f1', weight: 3, dashArray: '8 6' }).addTo(map);
      } else if (bounds.length === 1) {
        map.setView(bounds[0], 14);
      }
    })();

    return () => { mapInstance.current?.remove(); mapInstance.current = null; };
  }, [pickup, destination]);

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b">
          <div>
            <p className="font-bold text-gray-800">Delivery Route</p>
            <p className="text-xs text-gray-500 font-mono">{trackingCode}</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-700 text-xl font-bold">✕</button>
        </div>
        <div className="px-5 py-3 bg-gray-50 text-xs flex gap-6">
          <span><span className="text-green-600 font-bold">●</span> {pickup}</span>
          <span><span className="text-red-500 font-bold">●</span> {destination}</span>
        </div>
        <div ref={mapRef} style={{ height: '380px', width: '100%' }} />
      </div>
    </div>
  );
}
