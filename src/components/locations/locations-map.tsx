'use client';

import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import 'leaflet-defaulticon-compatibility/dist/leaflet-defaulticon-compatibility.css';
import 'leaflet-defaulticon-compatibility';
import type { Location, Client } from '@/lib/types';
import { useEffect, useState } from 'react';
import type { Map } from 'leaflet';

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
  const [map, setMap] = useState<Map | null>(null);
  const defaultCenter: [number, number] = [-38.4161, -63.6167];

  useEffect(() => {
    // This cleanup function runs when the component unmounts.
    // In React's Strict Mode, components are mounted, unmounted, and then mounted again
    // to detect issues. This cleanup ensures the map instance is properly destroyed
    // before the next mount, preventing the "Map container is already initialized" error.
    return () => {
      if (map) {
        map.off(); // Detach all event listeners
        map.remove(); // Destroy the map instance
      }
    };
  }, [map]);
  
  return (
    <MapContainer
      center={defaultCenter}
      zoom={4}
      style={{ height: '100%', width: '100%' }}
      className="rounded-lg"
      whenCreated={setMap}
    >
      <TileLayer
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
      />
      {map ? <DynamicMapContent client={client} locations={locations} /> : null}
    </MapContainer>
  );
}
export default LocationsMap;
