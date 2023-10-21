"use client";

import { useEffect, useRef, useState } from "react";
import useSWR from "swr";
import maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import { Inter } from "next/font/google";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

const inter = Inter({ subsets: ["latin"] });

export default function MapPage({ params }: { params: { lineNo: string } }) {
  const mapContainer = useRef(null),
    map = useRef<maplibregl.Map | null>(null),
    [lng, setLng] = useState(-1.239991),
    [lat, setLat] = useState(54.57602),
    [zoom, setZoom] = useState(15),
    [markers, setMarkers] = useState<maplibregl.Marker[]>([]),
    { data, error, isLoading } = useSWR(`/api/datafeed/${params.lineNo}`, fetcher, {
      refreshInterval: 10000,
    });
  useEffect(() => {
    if (map.current) return; // initialize map only once
    map.current = new maplibregl.Map({
      container: mapContainer.current as unknown as HTMLElement,
      style: {
        version: 8,
        sources: {
          "raster-tiles": {
            type: "raster",
            tiles: [
              // NOTE: Layers from Stadia Maps do not require an API key for localhost development or most production
              // web deployments. See https://docs.stadiamaps.com/authentication/ for details.
              "https://tile.openstreetmap.org/{z}/{x}/{y}.png",
            ],
            tileSize: 256,
            attribution:
              '© <a href="https://openstreetmap.org">OpenStreetMap</a> contributors',
          },
        },
        layers: [
          {
            id: "tiles",
            type: "raster",
            source: "raster-tiles",
            minzoom: 0,
            maxzoom: 22,
          },
        ],
      },
      center: [lng, lat],
      zoom: zoom,
    });
  }, []);
  useEffect(() => {
    if (!data || isLoading) return;
    markers.forEach((marker: maplibregl.Marker) => marker.remove());
    const newMarkers: maplibregl.Marker[] = [];
    data.Siri.ServiceDelivery[0].VehicleMonitoringDelivery[0].VehicleActivity.forEach(
      (va: Record<string, unknown>) => {
        if(new Date((va.ValidUntilTime as string[])[0] + "Z") < new Date() || (Number(new Date()) - Number(new Date((va.RecordedAtTime as string[])[0]))) >= 900000) return; // if no longer valid or more than 15 minutes old
        const el = document.createElement("div");
        el.className = "marker";
        el.style.backgroundImage = "url('/marker.svg')";
        el.style.width = "20px";
        el.style.height = "48px";
        const label = document.createElement("div");
        label.textContent = (va.MonitoredVehicleJourney as any)[0].PublishedLineName;
        label.style.width = "28px";
        label.style.height = "28px";
        label.style.textAlign = "center";
        label.style.fontWeight = "bold";
        label.style.backgroundColor = "#4264fb";
        label.style.padding = "4px";
        label.style.borderRadius = "100%";
        label.style.marginTop = "-12px";
        label.style.marginLeft = "-4px";
        label.style.fontFamily = inter.style.fontFamily
        el.appendChild(label);
        const popup = new maplibregl.Popup({ offset: 25 }).setText(
            `${(va.MonitoredVehicleJourney as any)[0].PublishedLineName} - ${
              (va.MonitoredVehicleJourney as any)[0].DestinationName
            } - Last updated: ${new Date((va.RecordedAtTime as string[])[0]).toLocaleString()}`
          ),
          marker = new maplibregl.Marker({element: el})
            .setLngLat([
              Number(
                (va.MonitoredVehicleJourney as any)[0].VehicleLocation[0]
                  .Longitude
              ),
              Number(
                (va.MonitoredVehicleJourney as any)[0].VehicleLocation[0]
                  .Latitude
              ),
            ])
            .setPopup(popup)
            .addTo(map.current as maplibregl.Map);
        newMarkers.push(marker);
      }
    );
    setMarkers(newMarkers);
  }, [data]);

  return (
    <div>
      <div ref={mapContainer} className="map-container" />
    </div>
  );
}
