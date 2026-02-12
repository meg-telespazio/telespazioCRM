'use client';

import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import 'leaflet-defaulticon-compatibility';

import type { Location } from '@/lib/types';
import { useEffect } from 'react';

type LocationsMapProps = {
  locations: Location[];
};

function BoundsSetter({ locations }: { locations: Location[] }) {
    const map = useMap();
    useEffect(() => {
        if (locations && locations.length > 0) {
            const bounds = locations.map(loc => [loc.latitude, loc.longitude] as [number, number]);
            if (bounds.length === 1) {
                map.setView(bounds[0], 13);
            } else {
                map.fitBounds(bounds, { padding: [50, 50] });
            }
        }
    }, [locations, map]);

    return null;
}

export function LocationsMap({ locations }: LocationsMapProps) {
  if (!locations || locations.length === 0) {
    return null;
  }

  const defaultCenter: [number, number] = [locations[0].latitude, locations[0].longitude];

  return (
    <MapContainer
      center={defaultCenter}
      zoom={13}
      style={{ height: '100%', width: '100%' }}
      className='rounded-lg'
    >
      <TileLayer
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
      />
      {locations.map((location) => (
        <Marker key={location.id} position={[location.latitude, location.longitude]}>
          <Popup>
            <div className="font-semibold">{location.name}</div>
            <div>{location.streetName} {location.streetNumber}</div>
            <div>{location.city}</div>
          </Popup>
        </Marker>
      ))}
      <BoundsSetter locations={locations} />
    </MapContainer>
  );
}
