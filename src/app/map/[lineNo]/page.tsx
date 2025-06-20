"use client";

import {
  useEffect,
  useMemo,
  useState,
  use,
  useCallback,
  CSSProperties,
} from "react";
import useSWR from "swr";
import "maplibre-gl/dist/maplibre-gl.css";
import { useRouter } from "next/navigation";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Map, ViewState } from "react-map-gl/maplibre";
import "animate.css";

import { mapStyle } from "@/lib/map";

import { DatafeedRouteResponse, Validity } from "@/lib/bods";
import FollowCard from "@/components/FollowCard";
import VehicleMarker from "@/components/map/VehicleMarker";
import MapNavbar from "@/components/map/MapNavbar";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

export default function MapPage(props: {
  params: Promise<{ lineNo: string }>;
  searchParams: Promise<{ vehicleId?: string }>;
}) {
  const searchParams = use(props.searchParams);
  const params = use(props.params);

  const [viewState, setViewState] = useState<Partial<ViewState>>({
      longitude: 0,
      latitude: 0,
      zoom: 15,
    }),
    [initialLocationSet, setInitialLocationSet] = useState(false),
    {
      data: datafeed,
      isLoading,
    } = useSWR<DatafeedRouteResponse>(
      `/api/datafeed/${params.lineNo}`,
      fetcher,
      {
        refreshInterval: 10000,
        onSuccess: () => {
          const event = new CustomEvent("map:reset-timer");
          document.dispatchEvent(event);
        },
      },
    ),
    [data, setData] = useState<DatafeedRouteResponse | null>(null),
    [following, setFollowing] = useState<string | null>(null),
    [openVehicle, setOpenVehicle] = useState<string | null>(null),
    router = useRouter();

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
    if (data.error == "Invalid lineNo") return router.push("/");
    if (!initialLocationSet && data.vehicles && data.vehicles.length > 0) {
      setViewState((v) => ({
        ...v,
        longitude: data.vehicles![0].longitude,
        latitude: data.vehicles![0].latitude,
      }));
      setInitialLocationSet(true);
    }
  }, [data, isLoading, initialLocationSet, router]);
  // Get user location
  useEffect(() => {
    if (navigator.geolocation && !searchParams.vehicleId) {
      navigator.permissions.query({ name: "geolocation" }).then((result) => {
        if (result.state == "granted" || result.state == "prompt") {
          navigator.geolocation.getCurrentPosition((pos) => {
            setViewState((v) => ({
              ...v,
              longitude: pos.coords.longitude,
              latitude: pos.coords.latitude,
            }));
            setInitialLocationSet(true);
          });
        }
      });
    }
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
    // TODO: use flyto?
    setViewState((vs) => ({
      ...vs,
      longitude: followedVehicle.longitude,
      latitude: followedVehicle.latitude,
    }));
  }, [followedVehicle, setViewState]);

  const togglePopup = useCallback(
      (vehicleRef: string) =>
        openVehicle === vehicleRef
          ? setOpenVehicle(null)
          : setOpenVehicle(vehicleRef),
      [openVehicle, setOpenVehicle],
    ),
    rotationStyle = useMemo<CSSProperties>(
      () =>
        ({
          "--map-rotation": `${viewState.bearing || 0}deg`,
        }) as CSSProperties,
      [viewState.bearing],
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
          {...viewState}
          onMove={(evt) => setViewState(evt.viewState)}
          mapStyle={mapStyle}
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
                popupOpen={openVehicle === vehicle.ref}
                togglePopup={togglePopup}
                setFollowing={setFollowing}
                following={vehicle.ref === following}
              />
            ))}
        </Map>
      </div>
      {followedVehicle && <FollowCard vehicle={followedVehicle} />}
    </>
  );
}
