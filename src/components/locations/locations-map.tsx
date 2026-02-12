'use client';

import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import 'leaflet-defaulticon-compatibility';
import type { Location } from '@/lib/types';
import { useEffect } from 'react';

type LocationsMapProps = {
  locations: Location[];
};

// This component will handle updates to markers and map view when locations change
function MapContent({ locations }: { locations: Location[] }) {
  const map = useMap();

  useEffect(() => {
    if (locations && locations.length > 0) {
      const bounds = locations.map(
        (loc) => [loc.latitude, loc.longitude] as [number, number]
      );
      if (bounds.length === 1) {
        // If there's only one location, just center on it.
        map.setView(bounds[0], 13);
      } else {
        // If there are multiple, fit them all in the view.
        map.fitBounds(bounds, { padding: [50, 50] });
      }
    }
  }, [locations, map]); // Re-run effect only when locations or map instance change

  return (
    <>
      {locations.map((location) => (
        <Marker
          key={location.id}
          position={[location.latitude, location.longitude]}
        >
          <Popup>
            <div className="font-semibold">{location.name}</div>
            <div>
              {location.streetName} {location.streetNumber}
            </div>
            <div>{location.city}</div>
          </Popup>
        </Marker>
      ))}
    </>
  );
}

export function LocationsMap({ locations }: LocationsMapProps) {
  // Don't render anything if there are no locations with coordinates
  if (!locations || locations.length === 0) {
    // This will be handled by the parent component, but good to have a guard
    return null;
  }

  // Use the first location for the initial center of the map.
  // The MapContent component will then adjust the view.
  const initialCenter: [number, number] = [
    locations[0].latitude,
    locations[0].longitude,
  ];

  return (
    <MapContainer
      center={initialCenter}
      zoom={13}
      style={{ height: '100%', width: '100%' }}
      className="rounded-lg"
    >
      <TileLayer
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
      />
      <MapContent locations={locations} />
    </MapContainer>
  );
}
