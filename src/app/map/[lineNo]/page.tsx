"use client";

import { useEffect, useMemo, useRef, useState, use } from "react";
import useSWR from "swr";
import "maplibre-gl/dist/maplibre-gl.css";
import { Inter } from "next/font/google";
import { Menubar, MenubarMenu, MenubarTrigger } from "@/components/ui/menubar";
import { FaArrowLeft } from "react-icons/fa";
import { useRouter } from "next/navigation";
import { Progress } from "@/components/ui/progress";
import { useStopwatch } from "react-timer-hook";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Map } from "@vis.gl/react-maplibre"
import "animate.css";

import { initializeMap, refreshMarkers, renderMarkers, mapStyle } from "@/lib/map";

// import type { Map, Marker } from "maplibre-gl";
import { DatafeedRouteResponse, Validity } from "@/lib/bods";
import FollowCard from "@/components/FollowCard";
import VehicleMarker from "@/components/map/VehicleMarker";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

const inter = Inter({ subsets: ["latin"] });

export default function MapPage(props: {
  params: Promise<{ lineNo: string }>;
  searchParams: Promise<{ vehicleId?: string }>;
}) {
  const searchParams = use(props.searchParams);
  const params = use(props.params);

  const [viewState, setViewState] = useState({
      longitude: null,
      latitude: null,
      zoom: 15
    }),
    [initialLocationSet, setInitialLocationSet] = useState(false),
    { totalSeconds, reset } = useStopwatch({ autoStart: true }),
    { data: datafeed, error, isLoading } = useSWR<DatafeedRouteResponse>(
      `/api/datafeed/${params.lineNo}`,
      fetcher,
      {
        refreshInterval: 10000,
        onSuccess: () => {
          reset();
        },
      },
    ),
    [data, setData] = useState<DatefeedRouteResponse | null>(null),
    [following, setFollowing] = useState<string | null>(null),
    router = useRouter();

  // Transform datafeed response to check data validity
  useEffect(() => {
    if(!datafeed) return;
    if(data === null || !data.vehicles) return setData(datafeed);

    const existingRefs = datafeed.vehicles.map(vehicle => vehicle.ref),
      expiringVehicles = data.vehicles.filter(vehicle => !existingRefs.includes(vehicle.ref))
        .map(vehicle => ({ ...vehicle, validity: vehicle.validity + 1 }))
        .filter(vehicle => vehicle.validity != Validity.Invalid);

    setData({
      ...datafeed,
      vehicles: [
        ...datafeed.vehicles,
        ...expiringVehicles
      ]
    })
  }, [datafeed, setData]);
  // Redirect if lineNo doesn't exist
  useEffect(() => {
    if (!data || isLoading) return;
    if (data.error == "Invalid lineNo") return router.push("/");
    if (!initialLocationSet && data.vehicles && data.vehicles.length > 0) {
      setViewState({
        ...viewState,
        longitude: data.vehicles[0].longitude,
        latitude: data.vehicles[0].latitude
      });
      setInitialLocationSet(true);
    }
  }, [data]);
  // Get user location
  useEffect(() => {
    if (navigator.geolocation && !searchParams.vehicleId) {
      navigator.permissions.query({ name: "geolocation" }).then((result) => {
        if (result.state == "granted" || result.state == "prompt") {
          navigator.geolocation.getCurrentPosition((pos) => {
            setViewState({
              ...viewState,
              longitude: pos.coords.longitude,
              latitude: pos.coords.latitude
            });
            setUserLocationSet(true);
          });
        }
      });
    }
  }, []);
  // Set following from URL
  useEffect(() => {
    if (typeof window == "undefined") return;
    if (searchParams.vehicleId) {
      setFollowing(searchParams.vehicleId);
    }
  }, [searchParams.vehicleId, setFollowing]);
  
  const followedVehicle = useMemo(() => {
    if (typeof window == "undefined") return null;
    return !following ? null : data?.vehicles?.find((vehicle) => vehicle.ref === following);
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
            <h1 className="text-sm grow text-center font-semibold md:px-32">
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
      {data && !data.error && !data.vehicles && (
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
      {/* TODO: Check these classes */}
      <div className="h-screen w-screen">
        {/* TODO: Check SSR example */}
        <Map
          {...viewState}
          onMove={evt => setViewState(evt.viewState)}
          mapStyle={mapStyle}
        >
          {(data?.vehicles.filter(vehicle => new Date(vehicle.validUntil) >= new Date() || Number(new Date()) - Number(new Date(vehicle.recordedAt)) < 900000) || [])
            .map(vehicle => <VehicleMarker key={vehicle.ref} vehicle={vehicle} mapBearing={viewState.bearing || 0} />)}
        </Map>
      </div>
      {followedVehicle && <FollowCard vehicle={followedVehicle} />}
    </>
  );
}
