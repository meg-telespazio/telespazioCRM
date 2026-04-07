'use client';

import 'leaflet/dist/leaflet.css';
import 'leaflet-defaulticon-compatibility/dist/leaflet-defaulticon-compatibility.css';
import 'leaflet-defaulticon-compatibility';

import { useEffect, useRef, useMemo } from 'react';
import L from 'leaflet';
import type { Location, Client } from '@/lib/types';
import { useI18n } from '@/firebase/client-provider';

type LocationsMapProps = {
  client?: Client | null;
  clients?: Client[];
  locations: Location[];
};

export function LocationsMap({ client, clients, locations }: LocationsMapProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const { t } = useI18n();
  const defaultCenter: L.LatLngTuple = [-38.4161, -63.6167];

  // Helper to generate a unique color per client
  const getClientColor = (clientId: string) => {
    let hash = 0;
    for (let i = 0; i < clientId.length; i++) {
      hash = clientId.charCodeAt(i) + ((hash << 5) - hash);
    }
    // Use HSL for better visibility control
    const hue = Math.abs(hash % 360);
    return `hsl(${hue}, 70%, 45%)`;
  };

  const clientMap = useMemo(() => {
    const map = new Map<string, Client>();
    if (clients) clients.forEach(c => map.set(c.id, c));
    if (client) map.set(client.id, client);
    return map;
  }, [client, clients]);

  useEffect(() => {
    if (typeof window !== 'undefined' && mapContainerRef.current && !mapInstanceRef.current) {
      const map = L.map(mapContainerRef.current).setView(defaultCenter, 4);

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
      }).addTo(map);

      mapInstanceRef.current = map;
    }
    
    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map || !locations) return;

    // Clear existing markers
    map.eachLayer((layer) => {
      if (layer instanceof L.CircleMarker) {
        map.removeLayer(layer);
      }
    });

    // Add new markers
    locations.forEach(location => {
      const targetClient = clientMap.get(location.clientId);
      const color = getClientColor(location.clientId);
      
      const popupContent = `
        <div class="p-1 min-w-[150px]">
          <div class="flex items-center gap-2 mb-1 border-b pb-1">
            <div style="background-color: ${color};" class="w-3 h-3 rounded-full shrink-0 shadow-sm"></div>
            <h3 class="font-bold text-sm text-slate-900 leading-tight">${targetClient?.name || 'Cliente'}</h3>
          </div>
          <div class="space-y-1 mt-2">
            <p class="text-[10px] font-bold text-primary uppercase tracking-tighter">${t(`LocationTypes.${location.type}`)}</p>
            <p class="text-xs text-slate-600">
              <span class="font-medium">${location.streetName} ${location.streetNumber}</span><br/>
              ${location.city}, ${location.province}
            </p>
          </div>
        </div>
      `;

      L.circleMarker([location.latitude, location.longitude], {
        radius: 8,
        fillColor: color,
        color: '#fff',
        weight: 2,
        opacity: 1,
        fillOpacity: 0.8
      })
      .addTo(map)
      .bindPopup(popupContent, {
        className: 'custom-leaflet-popup'
      });
    });

    if (locations.length > 0) {
      const bounds = L.latLngBounds(locations.map(loc => [loc.latitude, loc.longitude]));
      if (locations.length === 1) {
          map.setView(bounds.getCenter(), 13);
      } else {
          map.fitBounds(bounds, { padding: [50, 50] });
      }
    }

  }, [locations, clientMap, t]);

  return <div ref={mapContainerRef} style={{ height: '100%', width: '100%' }} className="rounded-lg z-0" />;
}

export default LocationsMap;
