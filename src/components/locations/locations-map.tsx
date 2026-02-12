'use client';

import 'leaflet/dist/leaflet.css';
import 'leaflet-defaulticon-compatibility/dist/leaflet-defaulticon-compatibility.css';
import 'leaflet-defaulticon-compatibility';

import { useEffect, useRef } from 'react';
import L from 'leaflet';
import type { Location, Client } from '@/lib/types';

type LocationsMapProps = {
  client: Client | null;
  locations: Location[];
};

export function LocationsMap({ client, locations }: LocationsMapProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const defaultCenter: L.LatLngTuple = [-38.4161, -63.6167];

  // Effect to initialize and clean up the map
  useEffect(() => {
    // Ensure this runs only in the browser and the container is available
    if (typeof window !== 'undefined' && mapContainerRef.current && !mapInstanceRef.current) {
      const map = L.map(mapContainerRef.current).setView(defaultCenter, 4);

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
      }).addTo(map);

      mapInstanceRef.current = map;
    }
    
    // Cleanup function to run when component unmounts
    // This is crucial for React Strict Mode in development
    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, []); // Empty dependency array ensures this effect runs only once on mount and cleanup on unmount

  // Effect to update markers when locations change
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map || !locations) return;

    // Clear existing markers
    map.eachLayer((layer) => {
      if (layer instanceof L.Marker) {
        map.removeLayer(layer);
      }
    });

    // Add new markers
    locations.forEach(location => {
      const popupContent = `
        <div class="space-y-1 leaflet-popup-content-wrapper">
          <h3 class="font-bold text-base">${client?.name || ''}</h3>
          <p class="font-semibold text-sm">${location.name}</p>
          <hr class="my-1"/>
          <p class="text-xs">${location.streetName} ${location.streetNumber}</p>
          <p class="text-xs">${location.postalCode} ${location.city}</p>
          <p class="text-xs">${location.province}, ${location.country}</p>
        </div>
      `;
      L.marker([location.latitude, location.longitude]).addTo(map).bindPopup(popupContent);
    });

    // Adjust map bounds
    if (locations.length > 0) {
      const bounds = L.latLngBounds(locations.map(loc => [loc.latitude, loc.longitude]));
      if (locations.length === 1) {
          map.setView(bounds.getCenter(), 13);
      } else {
          map.fitBounds(bounds, { padding: [50, 50] });
      }
    }

  }, [locations, client]);

  // Render a div that Leaflet will attach to.
  return <div ref={mapContainerRef} style={{ height: '100%', width: '100%' }} className="rounded-lg z-0" />;
}

export default LocationsMap;
