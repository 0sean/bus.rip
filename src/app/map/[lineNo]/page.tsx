"use client";

import { useEffect, useRef, useState } from "react";
import useSWR from "swr";
import maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import { Inter } from "next/font/google";
import { Menubar, MenubarMenu, MenubarTrigger } from "@/components/ui/menubar";
import { FaArrowLeft } from "react-icons/fa";
import { useRouter } from "next/navigation";
import { Progress } from "@/components/ui/progress";
import { useStopwatch } from "react-timer-hook";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import "animate.css";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

const inter = Inter({ subsets: ["latin"] });

export default function MapPage({ params }: { params: { lineNo: string } }) {
  const mapContainer = useRef(null),
    map = useRef<maplibregl.Map | null>(null),
    [lng, setLng] = useState<number | null>(null),
    [lat, setLat] = useState<number | null>(null),
    [markers, setMarkers] = useState<maplibregl.Marker[]>([]),
    { totalSeconds, reset } = useStopwatch({ autoStart: true }),
    { data, error, isLoading } = useSWR(
      `/api/datafeed/${params.lineNo}`,
      fetcher,
      {
        refreshInterval: 10000,
        onSuccess: () => {
          reset();
        },
      },
    ),
    router = useRouter();
  useEffect(() => {
    if (map.current) return; // initialize map only once
    map.current = new maplibregl.Map({
      container: mapContainer.current as unknown as HTMLElement,
      style: {
        version: 8,
        sources: {
          "raster-tiles": {
            type: "raster",
            tiles: ["https://tile.openstreetmap.org/{z}/{x}/{y}.png"],
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
      center: lng != null && lat != null ? [lng, lat] : undefined,
      zoom: 15,
    });
  }, []);
  useEffect(() => {
    if (!data || isLoading) return;
    if (data.error == "Invalid lineNo") return router.push("/");
    if (data.error) return;
    const newMarkers: maplibregl.Marker[] = [];
    markers.forEach((marker: maplibregl.Marker) => {
      const va =
        data.data.Siri.ServiceDelivery[0].VehicleMonitoringDelivery[0].VehicleActivity.find(
          (va: Record<string, unknown>) =>
            (va.MonitoredVehicleJourney as any)[0].VehicleRef[0] ==
            marker.getElement().dataset.vehicle,
        );
      if (!va) {
        const el = marker.getElement();
        if (
          el.dataset.arrives != undefined &&
          new Date(el.dataset.arrives as string) < new Date()
        ) {
          marker.remove();
        } else {
          if (!el.dataset.unavailable) {
            el.dataset.unavailable = "1";
            el.style.opacity = "0.75";
            newMarkers.push(marker);
          } else if (el.dataset.unavailable == "1") {
            el.dataset.unavailable = "2";
            el.style.opacity = "0.5";
            newMarkers.push(marker);
          } else {
            marker.remove();
          }
        }
      } else {
        marker.remove();
      }
    });
    if (
      data.data.Siri.ServiceDelivery[0].VehicleMonitoringDelivery[0]
        .VehicleActivity
    ) {
      if (!lng || !lat) {
        setLng(
          Number(
            (
              data.data.Siri.ServiceDelivery[0].VehicleMonitoringDelivery[0]
                .VehicleActivity[0].MonitoredVehicleJourney as any
            )[0].VehicleLocation[0].Longitude,
          ),
        );
        setLat(
          Number(
            (
              data.data.Siri.ServiceDelivery[0].VehicleMonitoringDelivery[0]
                .VehicleActivity[0].MonitoredVehicleJourney as any
            )[0].VehicleLocation[0].Latitude,
          ),
        );
      }
      data.data.Siri.ServiceDelivery[0].VehicleMonitoringDelivery[0].VehicleActivity.forEach(
        (va: Record<string, unknown>) => {
          if (
            new Date((va.ValidUntilTime as string[])[0] + "Z") < new Date() ||
            Number(new Date()) -
              Number(new Date((va.RecordedAtTime as string[])[0])) >=
              900000
          )
            return; // if no longer valid or more than 15 minutes old
          const el = document.createElement("div");
          el.className = "marker";
          el.style.width = "28px";
          el.style.height = "28px";
          el.dataset.vehicle = (
            va.MonitoredVehicleJourney as any
          )[0].VehicleRef[0];
          if (
            (va.MonitoredVehicleJourney as any)[0].DestinationAimedArrivalTime
          ) {
            el.dataset.arrives = (
              va.MonitoredVehicleJourney as any
            )[0].DestinationAimedArrivalTime[0];
          }
          const label = document.createElement("div");
          label.textContent = (
            va.MonitoredVehicleJourney as any
          )[0].PublishedLineName[0];
          label.style.width = "28px";
          label.style.height = "28px";
          label.style.textAlign = "center";
          label.style.fontWeight = "bold";
          if (
            (va.MonitoredVehicleJourney as any)[0].PublishedLineName[0].length >
            2
          ) {
            label.style.fontSize = "10px";
          } else {
            label.style.fontSize = "12px";
          }
          label.style.backgroundColor = "#161616";
          label.style.padding = "4px";
          label.style.borderRadius = "100%";
          label.style.fontFamily = inter.style.fontFamily;
          label.style.boxShadow = "0px 0px 30px 0px rgba(0, 0, 0, 0.5)";
          label.style.rotate = `calc(var(--map-rotation) - ${
            (va.MonitoredVehicleJourney as any)[0].Bearing
          }deg)`;
          el.appendChild(label);
          const arrowContainer = document.createElement("div");
          arrowContainer.style.width = "28px";
          arrowContainer.style.height = "42px";
          arrowContainer.style.position = "absolute";
          arrowContainer.style.top = "-14px";
          arrowContainer.style.left = "0";
          const arrow = document.createElement("div");
          arrow.style.width = "12px";
          arrow.style.height = "12px";
          arrow.style.backgroundImage = "url('/arrow.svg')";
          arrow.style.backgroundRepeat = "no-repeat";
          arrow.style.backgroundPosition = "bottom center";
          arrow.style.margin = "0 auto";
          arrowContainer.appendChild(arrow);
          el.appendChild(arrowContainer);

          const popup = new maplibregl.Popup({ offset: 25 }).setText(
              `${(va.MonitoredVehicleJourney as any)[0].PublishedLineName} - ${(
                va.MonitoredVehicleJourney as any
              )[0].DestinationName[0].replaceAll(
                "_",
                " ",
              )} - Last updated: ${new Date(
                (va.RecordedAtTime as string[])[0],
              ).toLocaleString()}`,
            ),
            marker = new maplibregl.Marker({
              element: el,
              rotation: (va.MonitoredVehicleJourney as any)[0].Bearing,
              rotationAlignment: "map",
            })
              .setLngLat([
                Number(
                  (va.MonitoredVehicleJourney as any)[0].VehicleLocation[0]
                    .Longitude,
                ),
                Number(
                  (va.MonitoredVehicleJourney as any)[0].VehicleLocation[0]
                    .Latitude,
                ),
              ])
              .setPopup(popup)
              .addTo(map.current as maplibregl.Map);
          newMarkers.push(marker);
        },
      );
    }

    setMarkers(newMarkers);
  }, [data]);
  useEffect(() => {
    if (!map) return;
    map.current!.on("move", (e) => {
      document.body.style.setProperty(
        "--map-rotation",
        `${map.current!.getBearing().toString()}deg`,
      );
    });
  }, [map]);
  useEffect(() => {
    if (navigator.geolocation) {
      navigator.permissions.query({ name: "geolocation" }).then((result) => {
        if (result.state == "granted" || result.state == "prompt") {
          navigator.geolocation.getCurrentPosition((pos) => {
            setLng(pos.coords.longitude);
            setLat(pos.coords.latitude);
          });
        }
      });
    }
  }, []);
  useEffect(() => {
    if (!map.current || lng == null || lat == null) return;
    map.current.setCenter([lng, lat]);
  }, [lng, lat]);

  return (
    <>
      <div className="fixed top-0 left-0 p-2 w-screen flex justify-center z-10">
        <Menubar className="w-full md:w-fit drop-shadow-2xl">
          <MenubarMenu>
            <MenubarTrigger
              className="hover:bg-zinc-800 transition-colors"
              onClick={() => {
                router.push("/");
              }}
            >
              <FaArrowLeft />
            </MenubarTrigger>
            <h1 className="text-sm flex-grow text-center font-semibold md:px-32">
              {data != undefined &&
                data.line != undefined &&
                !isLoading &&
                data.line.publicName}
            </h1>
            <div className="px-3 py-1.5">
              <Progress
                value={totalSeconds * 10}
                style={{ width: 14, height: 14 }}
              />
            </div>
          </MenubarMenu>
        </Menubar>
      </div>
      {data &&
        !data.error &&
        !data.data.Siri.ServiceDelivery[0].VehicleMonitoringDelivery[0]
          .VehicleActivity && (
          <Alert className="right-2 bottom-2 fixed z-10 w-fit drop-shadow-2xl animate__animated animate__faster animate__fadeInUp">
            <AlertTitle className="font-semibold">
              No location data available
            </AlertTitle>
            <AlertDescription>
              It may be available under another provider.
            </AlertDescription>
          </Alert>
        )}
      {data && data.error == "Too many requests" && (
        <Alert className="right-2 bottom-2 fixed z-10 w-fit drop-shadow-2xl animate__animated animate__faster animate__fadeInUp">
          <AlertTitle className="font-semibold">
            You are being rate limited.
          </AlertTitle>
        </Alert>
      )}
      <div>
        <div ref={mapContainer} className="map-container" />
      </div>
    </>
  );
}
