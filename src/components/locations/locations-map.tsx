'use client';

import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import 'leaflet-defaulticon-compatibility';
import type { Location, Client } from '@/lib/types';
import { useEffect } from 'react';
import { Skeleton } from '../ui/skeleton';

type LocationsMapProps = {
  client: Client | null;
  locations: Location[];
};

function DynamicMapContent({ client, locations }: { client: Client | null, locations: Location[] }) {
  const map = useMap();

  useEffect(() => {
    if (locations && locations.length > 0) {
      const bounds = locations.map(
        (loc) => [loc.latitude, loc.longitude] as [number, number]
      );
      if (bounds.length === 1) {
        map.setView(bounds[0], 13);
      } else {
        map.fitBounds(bounds, { padding: [50, 50] });
      }
    }
  }, [locations, map]);

  return (
    <>
      {locations.map((location) => (
        <Marker
          key={location.id}
          position={[location.latitude, location.longitude]}
        >
          <Popup>
            <div className="space-y-1">
              <h3 className="font-bold text-base">{client?.name}</h3>
              <p className="font-semibold text-sm">{location.name}</p>
              <hr className="my-1"/>
              <p className="text-xs">{location.streetName} {location.streetNumber}</p>
              <p className="text-xs">{location.postalCode} {location.city}</p>
              <p className="text-xs">{location.province}, {location.country}</p>
            </div>
          </Popup>
        </Marker>
      ))}
    </>
  );
}

export function LocationsMap({ client, locations }: LocationsMapProps) {
  // A safe default center (approx. center of Argentina)
  const defaultCenter: [number, number] = [-38.4161, -63.6167];

  return (
    <MapContainer
      center={defaultCenter}
      zoom={4}
      style={{ height: '100%', width: '100%' }}
      className="rounded-lg"
    >
      <TileLayer
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
      />
      <DynamicMapContent client={client} locations={locations} />
    </MapContainer>
  );
}
