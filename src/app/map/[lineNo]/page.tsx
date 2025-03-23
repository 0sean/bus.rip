"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import useSWR from "swr";
import "maplibre-gl/dist/maplibre-gl.css";
import { Inter } from "next/font/google";
import { Menubar, MenubarMenu, MenubarTrigger } from "@/components/ui/menubar";
import { FaArrowLeft } from "react-icons/fa";
import { useRouter } from "next/navigation";
import { Progress } from "@/components/ui/progress";
import { useStopwatch } from "react-timer-hook";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import "animate.css";

import { initializeMap, refreshMarkers, renderMarkers } from "@/lib/map";

import type { Map, Marker } from "maplibre-gl";
import { DatafeedRouteResponse } from "@/lib/bods";
import FollowCard from "@/components/FollowCard";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

const inter = Inter({ subsets: ["latin"] });

export default function MapPage({
  params,
  searchParams,
}: {
  params: { lineNo: string };
  searchParams: { vehicleId?: string };
}) {
  const mapContainer = useRef(null),
    map = useRef<Map | null>(null),
    [lng, setLng] = useState<number | null>(null),
    [lat, setLat] = useState<number | null>(null),
    [markers, setMarkers] = useState<Marker[]>([]),
    { totalSeconds, reset } = useStopwatch({ autoStart: true }),
    { data, error, isLoading } = useSWR<DatafeedRouteResponse>(
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

  // Load map
  useEffect(() => {
    if (map.current) return; // initialize map only once
    map.current = initializeMap(mapContainer, lng, lat);
  }, []);
  // Render markers, labels, popups, arrows
  useEffect(() => {
    if (!data || isLoading) return;
    if (data.error == "Invalid lineNo") return router.push("/");
    if (data.error) return;
    const newMarkers: Marker[] = [
      ...refreshMarkers(data, markers),
      ...renderMarkers(data, map, lng, lat, setLng, setLat, inter),
    ];

    setMarkers(newMarkers);
  }, [data]);
  // Set map rotation
  useEffect(() => {
    if (!map) return;
    map.current!.on("move", (e) => {
      document.body.style.setProperty(
        "--map-rotation",
        `${map.current!.getBearing().toString()}deg`,
      );
    });
  }, [map]);
  // Get user location
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
  // Set map center from user location
  useEffect(() => {
    if (!map.current || lng == null || lat == null || searchParams.vehicleId)
      return;
    map.current.setCenter([lng, lat]);
  }, [lng, lat]);
  // Set following from URL
  useEffect(() => {
    if (typeof window == "undefined") return;
    if (searchParams.vehicleId) {
      document.body.dataset.following = searchParams.vehicleId;
    }
  }, []);

  const follow = useMemo(() => {
    if (typeof window == "undefined") return null;
    return !document.body.dataset.following
      ? null
      : data?.data.Siri.ServiceDelivery[0].VehicleMonitoringDelivery[0].VehicleActivity.find(
          (va) =>
            va.MonitoredVehicleJourney[0].VehicleRef[0] ==
            document.body.dataset.following,
        );
  }, [data, totalSeconds]);

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
      {follow && <FollowCard follow={follow} />}
    </>
  );
}
