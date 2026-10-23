import {
  useEffect,
  useMemo,
  useState,
  useCallback,
  CSSProperties,
  useRef,
} from "react";
import { useQuery } from "@tanstack/react-query";
import { locationsOptions, stopsOptions } from "@/data/queries";
import "maplibre-gl/dist/maplibre-gl.css";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Map, MapRef } from "react-map-gl/maplibre";

import { mapStyle } from "@/lib/map";

import { DatafeedRouteResponse, Validity } from "@/lib/bods";
import FollowCard from "@/components/map/FollowCard";
import VehicleMarker from "@/components/map/VehicleMarker";
import MapNavbar from "@/components/map/MapNavbar";
import LocationMarker from "@/components/map/LocationMarker";

import StopMarker from "@/components/map/StopMarker";

export default function MapPage({
  nocCode,
  vehicleId,
}: {
  nocCode: string;
  vehicleId?: string;
}) {
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
    {
      data: datafeed,
      isLoading,
      error: locationError,
      dataUpdatedAt,
    } = useQuery(locationsOptions(nocCode)),
    { data: stops, error: stopsError } = useQuery(stopsOptions(nocCode)),
    [data, setData] = useState<DatafeedRouteResponse | null>(null),
    [following, setFollowing] = useState<string | null>(null),
    [openPopup, setOpenPopup] = useState<string | null>(null),
    loadQueue = useRef<(() => void)[]>([]),
    enqueueLoadAction = useCallback((action: () => void) => {
      if (mapRef.current) {
        action();
      } else {
        loadQueue.current.push(action);
      }
    }, []);

  useEffect(() => {
    if (!datafeed) return;
    document.dispatchEvent(new CustomEvent("map:reset-timer"));
    setData((previous) => {
      if (!previous?.vehicles || !datafeed.vehicles) return datafeed;
      const refs = new Set(datafeed.vehicles.map((vehicle) => vehicle.ref));
      const expiringVehicles = previous.vehicles
        .filter((vehicle) => !refs.has(vehicle.ref))
        .map((vehicle) => ({ ...vehicle, validity: vehicle.validity + 1 }))
        .filter((vehicle) => vehicle.validity !== Validity.Invalid);
      return {
        ...datafeed,
        vehicles: [...datafeed.vehicles, ...expiringVehicles],
      };
    });
  }, [datafeed, dataUpdatedAt]);
  // Center the map when the first vehicles arrive.
  useEffect(() => {
    if (!data || isLoading) return;

    function moveToVehicle() {
      if (!initialLocationSet && data!.vehicles && data!.vehicles.length > 0) {
        setLocation(data!.vehicles[0].longitude, data!.vehicles[0].latitude);
        setInitialLocationSet(true);
      }
    }

    enqueueLoadAction(moveToVehicle);
  }, [data, isLoading, initialLocationSet, enqueueLoadAction, setLocation]);
  // Get user location
  useEffect(() => {
    function moveToUser() {
      if (navigator.geolocation && !vehicleId) {
        navigator.permissions
          ?.query({ name: "geolocation" })
          .then((result) => {
            if (result.state == "granted" || result.state == "prompt") {
              navigator.geolocation.getCurrentPosition((pos) => {
                setLocation(pos.coords.longitude, pos.coords.latitude);
                setInitialLocationSet(true);
                setUserLocation([pos.coords.longitude, pos.coords.latitude]);
              });
            }
          })
          .catch(() => {});
      }
    }

    enqueueLoadAction(moveToUser);
  }, [vehicleId, enqueueLoadAction, setLocation]);
  // Set following from URL
  useEffect(() => {
    if (typeof window == "undefined") return;
    if (vehicleId) {
      setFollowing(vehicleId);
    }
  }, [vehicleId, setFollowing]);

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
        <Alert className="map-alert-enter right-2 bottom-2 fixed z-10 w-fit drop-shadow-2xl">
          <AlertTitle className="font-semibold">
            No location data available
          </AlertTitle>
          <AlertDescription>
            It may be available under another provider.
          </AlertDescription>
        </Alert>
      )}
      {(locationError || stopsError) && (
        <Alert role="alert" className="right-2 bottom-2 fixed z-10 w-fit">
          <AlertTitle>Unable to refresh transit data</AlertTitle>
          <AlertDescription>
            {locationError?.message || stopsError?.message}
          </AlertDescription>
        </Alert>
      )}
      <div className="h-screen w-screen" style={rotationStyle}>
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
          onLoad={() => {
            const actions = loadQueue.current.splice(0);
            actions.forEach((action) => action());
          }}
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
                  noc={nocCode}
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
