"use client";

import {
  useEffect,
  useMemo,
  useState,
  use,
  useCallback,
  CSSProperties,
  useRef,
} from "react";
import useSWR from "swr";
import useSWRImmutable from "swr/immutable";
import "maplibre-gl/dist/maplibre-gl.css";
import { useRouter } from "next/navigation";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { LngLatBounds, Map, MapRef } from "react-map-gl/maplibre";
import "animate.css";

import { mapStyle } from "@/lib/map";

import { DatafeedRouteResponse, Validity } from "@/lib/bods";
import FollowCard from "@/components/map/FollowCard";
import VehicleMarker from "@/components/map/VehicleMarker";
import MapNavbar from "@/components/map/MapNavbar";
import LocationMarker from "@/components/map/LocationMarker";
import type { ApiError, Stop } from "@/lib/buslane";
import StopMarker from "@/components/map/StopMarker";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

export default function MapPage(props: {
  params: Promise<{ nocCode: string }>;
  searchParams: Promise<{ vehicleId?: string }>;
}) {
  const searchParams = use(props.searchParams);
  const params = use(props.params);

  const mapRef = useRef<MapRef>(null),
    setLocation = useCallback(
      (lng: number, lat: number, animate: boolean = false) => {
        if (!mapRef.current) return;
        mapRef.current.flyTo({
          center: [lng, lat],
          animate,
        });
      },
      [],
    ),
    [bearing, setBearing] = useState(0),
    [initialLocationSet, setInitialLocationSet] = useState(false),
    [userLocation, setUserLocation] = useState<[number, number] | null>(null),
    { data: datafeed, isLoading } = useSWR<DatafeedRouteResponse>(
      `/api/${params.nocCode}/location`,
      fetcher,
      {
        refreshInterval: 10000,
        onSuccess: () => {
          const event = new CustomEvent("map:reset-timer");
          document.dispatchEvent(event);
        },
      },
    ),
    { data: stops } = useSWRImmutable<Stop[] | ApiError>(
      `/api/${params.nocCode}/stops`,
      fetcher,
    ),
    [data, setData] = useState<DatafeedRouteResponse | null>(null),
    [following, setFollowing] = useState<string | null>(null),
    [openPopup, setOpenPopup] = useState<string | null>(null),
    router = useRouter(),
    loadQueue = useRef<(() => void)[]>([]),
    enqueueLoadAction = useCallback((action: () => void) => {
      if (mapRef.current) {
        action();
      } else {
        loadQueue.current.push(action);
      }
    }, []);

  // Transform datafeed response to check data validity
  useEffect(() => {
    if (!datafeed) return;
    if (data === null || !data.vehicles || !datafeed.vehicles)
      return setData(datafeed);

    const existingRefs = datafeed.vehicles.map((vehicle) => vehicle.ref),
      expiringVehicles = data.vehicles
        .filter((vehicle) => !existingRefs.includes(vehicle.ref))
        .map((vehicle) => ({ ...vehicle, validity: vehicle.validity + 1 }))
        .filter((vehicle) => vehicle.validity != Validity.Invalid);

    setData({
      ...datafeed,
      vehicles: [...datafeed.vehicles, ...expiringVehicles],
    });
  }, [datafeed, setData]);
  // Redirect if lineNo doesn't exist
  useEffect(() => {
    if (!data || isLoading) return;
    if (data.error == "Invalid nocCode") return router.push("/");

    function moveToVehicle() {
      if (!initialLocationSet && data!.vehicles && data!.vehicles.length > 0) {
        setLocation(data!.vehicles[0].longitude, data!.vehicles[0].latitude);
        setInitialLocationSet(true);
      }
    }

    enqueueLoadAction(moveToVehicle);
  }, [data, isLoading, initialLocationSet, router]);
  // Get user location
  useEffect(() => {
    function moveToUser() {
      if (navigator.geolocation && !searchParams.vehicleId) {
        navigator.permissions.query({ name: "geolocation" }).then((result) => {
          if (result.state == "granted" || result.state == "prompt") {
            navigator.geolocation.getCurrentPosition((pos) => {
              setLocation(pos.coords.longitude, pos.coords.latitude);
              setInitialLocationSet(true);
              setUserLocation([pos.coords.longitude, pos.coords.latitude]);
            });
          }
        });
      }
    }

    enqueueLoadAction(moveToUser);
  }, [searchParams.vehicleId]);
  // Set following from URL
  useEffect(() => {
    if (typeof window == "undefined") return;
    if (searchParams.vehicleId) {
      setFollowing(searchParams.vehicleId);
    }
  }, [searchParams.vehicleId, setFollowing]);

  const followedVehicle = useMemo(() => {
    if (typeof window == "undefined") return null;
    return !following
      ? null
      : data?.vehicles?.find((vehicle) => vehicle.ref === following);
  }, [following, data]);

  // Follow vehicle
  useEffect(() => {
    if (!followedVehicle) return;
    setLocation(followedVehicle.longitude, followedVehicle.latitude, true);
  }, [followedVehicle, setLocation]);

  const togglePopup = useCallback(
      (ref: string | null) =>
        openPopup === ref || ref === null
          ? setOpenPopup(null)
          : setOpenPopup(ref),
      [openPopup, setOpenPopup],
    ),
    rotationStyle = useMemo<CSSProperties>(
      () =>
        ({
          "--map-rotation": `${bearing || 0}deg`,
        }) as CSSProperties,
      [bearing],
    ),
    [bounds, setBounds] = useState<[number, number][] | null>(null),
    [zoom, setZoom] = useState<number>(15),
    withinBounds = useCallback(
      (lng: number, lat: number) => {
        if (!bounds) return false;
        if (zoom < 15) return false;
        const [sw, ne] = bounds;
        return lng >= sw[0] && lng <= ne[0] && lat >= sw[1] && lat <= ne[1];
      },
      [bounds, zoom],
    );

  return (
    <>
      <MapNavbar data={data} isLoading={isLoading} />
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
      <div className="h-screen w-screen" style={rotationStyle}>
        {/* TODO: Check SSR example */}
        <Map
          mapStyle={mapStyle}
          ref={mapRef}
          onRotate={(e) => setBearing(e.viewState.bearing || 0)}
          onClick={(e) => {
            if (
              (e.originalEvent.target as HTMLElement).closest(
                ".maplibregl-marker",
              )
            )
              return;
            togglePopup(null);
          }}
          onLoad={() => loadQueue.current.forEach((action) => action())}
          onMove={(e) => setBounds(e.target.getBounds().toArray())}
          onZoom={(e) => setZoom(e.target.getZoom())}
          initialViewState={{
            longitude: 0,
            latitude: 0,
            zoom: 15,
          }}
        >
          {(data?.vehicles || [])
            .filter(
              (vehicle) =>
                new Date(vehicle.validUntil) >= new Date() ||
                Number(new Date()) - Number(new Date(vehicle.recordedAt)) <
                  900000,
            )
            .map((vehicle) => (
              <VehicleMarker
                key={vehicle.ref}
                vehicle={vehicle}
                popupOpen={openPopup === `vehicle:${vehicle.ref}`}
                togglePopup={() => togglePopup(`vehicle:${vehicle.ref}`)}
                setFollowing={setFollowing}
                following={vehicle.ref === following}
              />
            ))}
          {userLocation && <LocationMarker location={userLocation} />}
          {stops &&
            Array.isArray(stops) &&
            stops
              .filter((stop) =>
                withinBounds(Number(stop.lon), Number(stop.lat)),
              )
              .map((stop) => (
                <StopMarker
                  key={stop.id}
                  stop={stop}
                  noc={params.nocCode}
                  popupOpen={openPopup === `stop:${stop.id}`}
                  togglePopup={() => togglePopup(`stop:${stop.id}`)}
                />
              ))}
        </Map>
      </div>
      {followedVehicle && <FollowCard vehicle={followedVehicle} />}
    </>
  );
}
