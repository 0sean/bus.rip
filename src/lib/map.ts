import maplibregl from "maplibre-gl";
import { formatDistanceToNow } from "date-fns";

import type { Dispatch, RefObject, SetStateAction } from "react";
import type { Marker } from "maplibre-gl";
import type { DatafeedRouteResponse, VehicleActivity } from "./bods";
import type { NextFont } from "next/dist/compiled/@next/font";

export function initializeMap(
  mapContainer: RefObject<HTMLDivElement>,
  lng: number | null,
  lat: number | null,
) {
  return new maplibregl.Map({
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
}

export function refreshMarkers(data: DatafeedRouteResponse, markers: Marker[]) {
  const newMarkers: Marker[] = [];

  markers.forEach((marker: Marker) => {
    const va =
      data.data.Siri.ServiceDelivery[0].VehicleMonitoringDelivery[0].VehicleActivity.find(
        (va) =>
          va.MonitoredVehicleJourney[0].VehicleRef[0] ==
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

  return newMarkers;
}

export function renderMarkers(
  data: DatafeedRouteResponse,
  map: RefObject<maplibregl.Map | null>,
  lng: number | null,
  lat: number | null,
  setLng: Dispatch<SetStateAction<number | null>>,
  setLat: Dispatch<SetStateAction<number | null>>,
  inter: NextFont,
) {
  const newMarkers: Marker[] = [];

  if (
    data.data.Siri.ServiceDelivery[0].VehicleMonitoringDelivery[0]
      .VehicleActivity
  ) {
    if (!lng || !lat) {
      setLng(
        Number(
          data.data.Siri.ServiceDelivery[0].VehicleMonitoringDelivery[0]
            .VehicleActivity[0].MonitoredVehicleJourney[0].VehicleLocation[0]
            .Longitude,
        ),
      );
      setLat(
        Number(
          data.data.Siri.ServiceDelivery[0].VehicleMonitoringDelivery[0]
            .VehicleActivity[0].MonitoredVehicleJourney[0].VehicleLocation[0]
            .Latitude,
        ),
      );
    }
    data.data.Siri.ServiceDelivery[0].VehicleMonitoringDelivery[0].VehicleActivity.forEach(
      (va) => {
        if (
          new Date(va.ValidUntilTime[0] + "Z") < new Date() ||
          Number(new Date()) - Number(new Date(va.RecordedAtTime[0])) >= 900000
        )
          return; // if no longer valid or more than 15 minutes old
        const el = renderMarker(va),
          label = renderLabel(va, inter);

        el.appendChild(label);
        if (va.MonitoredVehicleJourney[0].Bearing != undefined) {
          const arrowContainer = renderArrow();
          el.appendChild(arrowContainer);
        }

        const popup = renderPopup(va, inter),
          marker = createMarker(el, va, popup, map);

        if (
          document.body.dataset.following ==
          va.MonitoredVehicleJourney[0].VehicleRef[0]
        ) {
          map.current!.flyTo({
            center: [
              Number(
                va.MonitoredVehicleJourney[0].VehicleLocation[0].Longitude,
              ),
              Number(va.MonitoredVehicleJourney[0].VehicleLocation[0].Latitude),
            ],
          });
        }

        newMarkers.push(marker);
      },
    );
  }

  return newMarkers;
}

function renderMarker(va: VehicleActivity) {
  const el = document.createElement("div");
  el.className = "marker";
  el.style.width = "28px";
  el.style.height = "28px";
  el.dataset.vehicle = va.MonitoredVehicleJourney[0].VehicleRef[0];
  if (va.MonitoredVehicleJourney[0].DestinationAimedArrivalTime) {
    el.dataset.arrives =
      va.MonitoredVehicleJourney[0].DestinationAimedArrivalTime[0];
  }

  return el;
}

function renderLabel(va: VehicleActivity, inter: NextFont) {
  const label = document.createElement("div");
  label.textContent = va.MonitoredVehicleJourney[0].PublishedLineName[0];
  label.style.width = "28px";
  label.style.height = "28px";
  label.style.textAlign = "center";
  label.style.fontWeight = "bold";
  if (va.MonitoredVehicleJourney[0].PublishedLineName[0].length > 2) {
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
    va.MonitoredVehicleJourney[0].Bearing || "0"
  }deg)`;

  return label;
}

function renderArrow() {
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

  return arrowContainer;
}

function renderPopup(va: VehicleActivity, inter: NextFont) {
  return new maplibregl.Popup({ offset: 24, maxWidth: "350" }).setHTML(
    renderPopupHTML(va, inter),
  );
}

function renderPopupHTML(va: VehicleActivity, inter: NextFont) {
  return `
  <div style="display: flex; width: 100%; font-family: ${
    inter.style.fontFamily
  };">
    <div style="width: 40%">
      <p style="font-size: 24px; font-weight: 600; margin-bottom: 6px;">${
        va.MonitoredVehicleJourney[0].OriginAimedDepartureTime != undefined
          ? new Date(va.MonitoredVehicleJourney[0].OriginAimedDepartureTime[0])
              .getHours()
              .toString()
              .padStart(2, "0")
          : "-"
      }:${
        va.MonitoredVehicleJourney[0].OriginAimedDepartureTime != undefined
          ? new Date(va.MonitoredVehicleJourney[0].OriginAimedDepartureTime[0])
              .getMinutes()
              .toString()
              .padStart(2, "0")
          : "-"
      }</p>
      <p style="line-height: 1.25;">${va.MonitoredVehicleJourney[0].OriginName[0].replaceAll(
        "_",
        " ",
      )}</p>
    </div>
    <div style="width: 20%; display: flex; justify-content: center; align-items: center;">
      <svg width="14" height="16" viewBox="0 0 14 16" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M13.7062 8.70625L8.70624 13.7062C8.51249 13.9031 8.25624 14 7.99999 14C7.74374 14 7.48812 13.9023 7.29312 13.707C6.90249 13.3164 6.90249 12.6836 7.29312 12.293L10.5875 9H0.999999C0.447812 9 4.95911e-05 8.55312 4.95911e-05 8C4.95911e-05 7.44688 0.447812 7 0.999999 7H10.5875L7.29374 3.70625C6.90312 3.31563 6.90312 2.68282 7.29374 2.29219C7.68437 1.90157 8.31718 1.90157 8.70781 2.29219L13.7078 7.29219C14.0969 7.68438 14.0969 8.31563 13.7062 8.70625Z" fill="white"/>
      </svg>
    </div>
    <div style="width: 40%; text-align: end;">
      <p style="font-size: 24px; font-weight: 600; margin-bottom: 6px;">${
        va.MonitoredVehicleJourney[0].DestinationAimedArrivalTime != undefined
          ? new Date(
              va.MonitoredVehicleJourney[0].DestinationAimedArrivalTime[0],
            )
              .getHours()
              .toString()
              .padStart(2, "0")
          : "-"
      }:${
        va.MonitoredVehicleJourney[0].DestinationAimedArrivalTime != undefined
          ? new Date(
              va.MonitoredVehicleJourney[0].DestinationAimedArrivalTime[0],
            )
              .getMinutes()
              .toString()
              .padStart(2, "0")
          : "-"
      }</p>
      <p style="line-height: 1.25;">${va.MonitoredVehicleJourney[0].DestinationName[0].replaceAll(
        "_",
        " ",
      )}</p>
    </div>
  </div>
  <p style="font-family: ${
    inter.style.fontFamily
  }; margin-top: 8px; opacity: 0.5; font-size: 11px;">Updated ${formatDistanceToNow(
    va.RecordedAtTime[0],
    { addSuffix: true, includeSeconds: true },
  )}</p>
  <button onClick="if(!this.classList.contains('following')) { document.body.dataset.following = '${
    va.MonitoredVehicleJourney[0].VehicleRef[0]
  }'; this.classList.add('following'); document.querySelector('.maplibregl-popup-close-button').click(); } else { document.body.dataset.following = ''; this.classList.remove('following') }" ${
    document.body.dataset.following ==
    va.MonitoredVehicleJourney[0].VehicleRef[0]
      ? 'class="following"'
      : ""
  } style="font-family: ${
    inter.style.fontFamily
  }; width: 100%; padding: 6px; border-radius: 4px; margin-top: 8px; border: 1px solid rgba(255, 255, 255, 0.1);">Follow</button>
`;
}

function createMarker(
  el: HTMLElement,
  va: VehicleActivity,
  popup: maplibregl.Popup,
  map: RefObject<maplibregl.Map | null>,
) {
  const bearing = Number(va.MonitoredVehicleJourney[0].Bearing);
  return new maplibregl.Marker({
    element: el,
    rotation: Number.isNaN(bearing) ? undefined : bearing,
    rotationAlignment: "map",
  })
    .setLngLat([
      Number(va.MonitoredVehicleJourney[0].VehicleLocation[0].Longitude),
      Number(va.MonitoredVehicleJourney[0].VehicleLocation[0].Latitude),
    ])
    .setPopup(popup)
    .addTo(map.current!);
}
