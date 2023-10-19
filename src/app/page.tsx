"use client";

import Image from 'next/image'
import mapboxgl from "mapbox-gl"
import { useEffect, useRef, useState } from 'react';
import useSWR from 'swr';
import 'mapbox-gl/dist/mapbox-gl.css'


mapboxgl.accessToken = "***REMOVED***";

const fetcher = (url: string) => fetch(url).then(r => r.json())

export default function Home() {
  const mapContainer = useRef(null),
    map = useRef<mapboxgl.Map | null>(null),
    [lng, setLng] = useState(-1.239991),
    [lat, setLat] = useState(54.576020),
    [zoom, setZoom] = useState(15),
    [markers, setMarkers] = useState<mapboxgl.Marker[]>([]),
    { data, error, isLoading } = useSWR("/api/datafeed", fetcher, { refreshInterval: 10000 });
  useEffect(() => {
    if (map.current) return; // initialize map only once
    map.current = new mapboxgl.Map({
      container: mapContainer.current as unknown as HTMLElement,
      style: 'mapbox://styles/mapbox/streets-v12',
      center: [lng, lat],
      zoom: zoom
    });
  }, []);
  useEffect(() => {
    if (!data || isLoading) return;
    markers.forEach((marker: mapboxgl.Marker) => marker.remove());
    const newMarkers: mapboxgl.Marker[] = [];
    data.Siri.ServiceDelivery[0].VehicleMonitoringDelivery[0].VehicleActivity.forEach((va: Record<string, unknown>) => {
      const popup = new mapboxgl.Popup({ offset: 25 }).setText(`${(va.MonitoredVehicleJourney as any)[0].PublishedLineName} - ${(va.MonitoredVehicleJourney as any)[0].DestinationName}`), 
        marker = new mapboxgl.Marker().setLngLat([Number((va.MonitoredVehicleJourney as any)[0].VehicleLocation[0].Longitude), Number((va.MonitoredVehicleJourney as any)[0].VehicleLocation[0].Latitude)]).setPopup(popup).addTo(map.current as mapboxgl.Map);
      markers.push(marker);
    });
    setMarkers(newMarkers);
   }, [data]);

  return <div>
    <div ref={mapContainer} className="map-container" />
  </div>
}
