"use client";

import { useEffect, useMemo, useRef, useState } from "react";
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
import { formatDistanceToNow } from "date-fns";
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
            (va.MonitoredVehicleJourney as any)[0].Bearing || "0"
          }deg)`;
          el.appendChild(label);
          if ((va.MonitoredVehicleJourney as any)[0].Bearing != undefined) {
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
          }

          // .setText(
          //   `${(va.MonitoredVehicleJourney as any)[0].PublishedLineName} - ${(
          //     va.MonitoredVehicleJourney as any
          //   )[0].DestinationName[0].replaceAll(
          //     "_",
          //     " ",
          //   )} - Last updated: ${new Date(
          //     (va.RecordedAtTime as string[])[0],
          //   ).toLocaleString()}`,
          // )

          const popup = new maplibregl.Popup({ offset: 24, maxWidth: "350" })
              .setHTML(`
            <div style="display: flex; width: 100%; font-family: ${
              inter.style.fontFamily
            };">
              <div style="width: 40%">
                <p style="font-size: 24px; font-weight: 600; margin-bottom: 6px;">${
                  (va.MonitoredVehicleJourney as any)[0]
                    .OriginAimedDepartureTime != undefined
                    ? new Date(
                        (
                          va.MonitoredVehicleJourney as any
                        )[0].OriginAimedDepartureTime[0],
                      )
                        .getHours()
                        .toString()
                        .padStart(2, "0")
                    : "-"
                }:${
                  (va.MonitoredVehicleJourney as any)[0]
                    .OriginAimedDepartureTime != undefined
                    ? new Date(
                        (
                          va.MonitoredVehicleJourney as any
                        )[0].OriginAimedDepartureTime[0],
                      )
                        .getMinutes()
                        .toString()
                        .padStart(2, "0")
                    : "-"
                }</p>
                <p style="line-height: 1.25;">${(
                  va.MonitoredVehicleJourney as any
                )[0].OriginName[0].replaceAll("_", " ")}</p>
              </div>
              <div style="width: 20%; display: flex; justify-content: center; align-items: center;">
                <svg width="14" height="16" viewBox="0 0 14 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M13.7062 8.70625L8.70624 13.7062C8.51249 13.9031 8.25624 14 7.99999 14C7.74374 14 7.48812 13.9023 7.29312 13.707C6.90249 13.3164 6.90249 12.6836 7.29312 12.293L10.5875 9H0.999999C0.447812 9 4.95911e-05 8.55312 4.95911e-05 8C4.95911e-05 7.44688 0.447812 7 0.999999 7H10.5875L7.29374 3.70625C6.90312 3.31563 6.90312 2.68282 7.29374 2.29219C7.68437 1.90157 8.31718 1.90157 8.70781 2.29219L13.7078 7.29219C14.0969 7.68438 14.0969 8.31563 13.7062 8.70625Z" fill="white"/>
                </svg>
              </div>
              <div style="width: 40%; text-align: end;">
                <p style="font-size: 24px; font-weight: 600; margin-bottom: 6px;">${
                  (va.MonitoredVehicleJourney as any)[0]
                    .DestinationAimedArrivalTime != undefined
                    ? new Date(
                        (
                          va.MonitoredVehicleJourney as any
                        )[0].DestinationAimedArrivalTime[0],
                      )
                        .getHours()
                        .toString()
                        .padStart(2, "0")
                    : "-"
                }:${
                  (va.MonitoredVehicleJourney as any)[0]
                    .DestinationAimedArrivalTime != undefined
                    ? new Date(
                        (
                          va.MonitoredVehicleJourney as any
                        )[0].DestinationAimedArrivalTime[0],
                      )
                        .getMinutes()
                        .toString()
                        .padStart(2, "0")
                    : "-"
                }</p>
                <p style="line-height: 1.25;">${(
                  va.MonitoredVehicleJourney as any
                )[0].DestinationName[0].replaceAll("_", " ")}</p>
              </div>
            </div>
            <p style="font-family: ${
              inter.style.fontFamily
            }; margin-top: 8px; opacity: 0.5; font-size: 11px;">Updated ${formatDistanceToNow(
              (va.RecordedAtTime as string[])[0],
              { addSuffix: true, includeSeconds: true },
            )}</p>
            <button onClick="if(!this.classList.contains('following')) { document.body.dataset.following = '${
              (va.MonitoredVehicleJourney as any)[0].VehicleRef[0]
            }'; this.classList.add('following'); document.querySelector('.maplibregl-popup-close-button').click(); } else { document.body.dataset.following = ''; this.classList.remove('following') }" ${
              document.body.dataset.following ==
              (va.MonitoredVehicleJourney as any)[0].VehicleRef[0]
                ? 'class="following"'
                : ""
            } style="font-family: ${
              inter.style.fontFamily
            }; width: 100%; padding: 6px; border-radius: 4px; margin-top: 8px; border: 1px solid rgba(255, 255, 255, 0.1);">Follow</button>
          `),
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

          if (
            document.body.dataset.following ==
            (va.MonitoredVehicleJourney as any)[0].VehicleRef[0]
          ) {
            (map.current as maplibregl.Map).flyTo({
              center: [
                Number(
                  (va.MonitoredVehicleJourney as any)[0].VehicleLocation[0]
                    .Longitude,
                ),
                Number(
                  (va.MonitoredVehicleJourney as any)[0].VehicleLocation[0]
                    .Latitude,
                ),
              ],
            });
          }

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

  const follow = useMemo(() => {
    if (typeof window == "undefined") return null;
    return !document.body.dataset.following
      ? null
      : data.data.Siri.ServiceDelivery[0].VehicleMonitoringDelivery[0].VehicleActivity.find(
          (va: Record<string, unknown>) =>
            (va.MonitoredVehicleJourney as any)[0].VehicleRef[0] ==
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
      {follow && (
        <div className="fixed bottom-4 w-full p-4">
          <Alert className="w-full">
            <div className="flex w-full">
              <div className="w-[40%]">
                <p className="text-2xl font-semibold mb-1.5">
                  {(follow.MonitoredVehicleJourney as any)[0]
                    .OriginAimedDepartureTime != undefined
                    ? new Date(
                        (
                          follow.MonitoredVehicleJourney as any
                        )[0].OriginAimedDepartureTime[0],
                      )
                        .getHours()
                        .toString()
                        .padStart(2, "0")
                    : "-"}
                  :
                  {(follow.MonitoredVehicleJourney as any)[0]
                    .OriginAimedDepartureTime != undefined
                    ? new Date(
                        (
                          follow.MonitoredVehicleJourney as any
                        )[0].OriginAimedDepartureTime[0],
                      )
                        .getMinutes()
                        .toString()
                        .padStart(2, "0")
                    : "-"}
                </p>
                <p className="leading-tight text-sm">
                  {(
                    follow.MonitoredVehicleJourney as any
                  )[0].OriginName[0].replaceAll("_", " ")}
                </p>
              </div>
              <div className="w-[20%] flex justify-center items-center">
                <svg
                  width="14"
                  height="16"
                  viewBox="0 0 14 16"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    d="M13.7062 8.70625L8.70624 13.7062C8.51249 13.9031 8.25624 14 7.99999 14C7.74374 14 7.48812 13.9023 7.29312 13.707C6.90249 13.3164 6.90249 12.6836 7.29312 12.293L10.5875 9H0.999999C0.447812 9 4.95911e-05 8.55312 4.95911e-05 8C4.95911e-05 7.44688 0.447812 7 0.999999 7H10.5875L7.29374 3.70625C6.90312 3.31563 6.90312 2.68282 7.29374 2.29219C7.68437 1.90157 8.31718 1.90157 8.70781 2.29219L13.7078 7.29219C14.0969 7.68438 14.0969 8.31563 13.7062 8.70625Z"
                    fill="white"
                  />
                </svg>
              </div>
              <div className="w-[40%] text-end">
                <p className="text-2xl font-semibold mb-1.5">
                  {(follow.MonitoredVehicleJourney as any)[0]
                    .DestinationAimedArrivalTime != undefined
                    ? new Date(
                        (
                          follow.MonitoredVehicleJourney as any
                        )[0].DestinationAimedArrivalTime[0],
                      )
                        .getHours()
                        .toString()
                        .padStart(2, "0")
                    : "-"}
                  :
                  {(follow.MonitoredVehicleJourney as any)[0]
                    .DestinationAimedArrivalTime != undefined
                    ? new Date(
                        (
                          follow.MonitoredVehicleJourney as any
                        )[0].DestinationAimedArrivalTime[0],
                      )
                        .getMinutes()
                        .toString()
                        .padStart(2, "0")
                    : "-"}
                </p>
                <p className="leading-tight text-sm">
                  {(
                    follow.MonitoredVehicleJourney as any
                  )[0].DestinationName[0].replaceAll("_", " ")}
                </p>
              </div>
            </div>
            <p className="mt-2 opacity-50 text-[11px]">
              Updated{" "}
              {formatDistanceToNow((follow.RecordedAtTime as string[])[0], {
                addSuffix: true,
                includeSeconds: true,
              })}
            </p>
          </Alert>
        </div>
      )}
    </>
  );
}
