import maplibregl from "maplibre-gl";
import { formatDistanceToNow } from "date-fns";

import type { Dispatch, RefObject, SetStateAction } from "react";
import type { Marker, StyleSpecification } from "maplibre-gl";
import type { DatafeedRouteResponse, Vehicle } from "./bods";
import type { NextFont } from "next/dist/compiled/@next/font";

// TODO: Make this type better
export const mapStyle = {
  version: 8 as const,
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
} as unknown as StyleSpecification;

// export function renderMarkers(
//   data: DatafeedRouteResponse,
//   map: RefObject<maplibregl.Map | null>,
//   lng: number | null,
//   lat: number | null,
//   setLng: Dispatch<SetStateAction<number | null>>,
//   setLat: Dispatch<SetStateAction<number | null>>,
//   inter: NextFont,
//   vehicleId?: string,
// ) {
//   const newMarkers: Marker[] = [];

//   if (data.vehicles) {
//     if (!lng || !lat) {
//       setLng(Number(data.vehicles[0].longitude));
//       setLat(Number(data.vehicles[0].latitude));
//     }
//     data.vehicles.forEach((vehicle) => {
//       if (
//         new Date(vehicle.validUntil) < new Date() ||
//         Number(new Date()) - Number(new Date(vehicle.recordedAt)) >= 900000
//       )
//         return; // if no longer valid or more than 15 minutes old
//       // const el = renderMarker(vehicle),
//         // label = renderLabel(vehicle, inter);

//       el.appendChild(label);
//       if (vehicle.bearing != null) {
//         // const arrowContainer = renderArrow();
//         el.appendChild(arrowContainer);
//       }

//       const popup = renderPopup(vehicle, inter),
//         marker = createMarker(el, vehicle, popup, map);

//       if (document.body.dataset.following == vehicle.ref) {
//         if (vehicleId) {
//           // Don't animate if vehicleId to avoid jumping + buggy animation on load
//           map.current!.flyTo({
//             center: [Number(vehicle.longitude), Number(vehicle.latitude)],
//             animate: false,
//           });
//         } else {
//           map.current!.flyTo({
//             center: [Number(vehicle.longitude), Number(vehicle.latitude)],
//           });
//         }
//       }

//       newMarkers.push(marker);
//     });
//   }

//   return newMarkers;
// }

// function renderMarker(vehicle: Vehicle) {
//   const el = document.createElement("div");
//   el.className = "marker";
//   el.style.width = "28px";
//   el.style.height = "28px";
//   el.dataset.vehicle = vehicle.ref;
//   if (vehicle.arrivalTime) {
//     el.dataset.arrives = vehicle.arrivalTime;
//   }

//   return el;
// }

// function renderPopup(vehicle: Vehicle, inter: NextFont) {
//   return new maplibregl.Popup({ offset: 24, maxWidth: "350" }).setHTML(
//     renderPopupHTML(vehicle, inter),
//   );
// }

// function renderHours(time?: string) {
//   return time != undefined
//     ? new Date(time).getHours().toString().padStart(2, "0")
//     : "-";
// }

// function renderMinutes(time?: string) {
//   return time != undefined
//     ? new Date(time).getMinutes().toString().padStart(2, "0")
//     : "-";
// }

// function renderTime(time?: string) {
//   return `${renderHours(time)}:${renderMinutes(time)}`;
// }

// function renderPopupHTML(vehicle: Vehicle, inter: NextFont) {
//   const departure = renderTime(vehicle.departureTime),
//     arrival = renderTime(vehicle.arrivalTime);

//   return `<div style="display: flex; width: 100%; font-family: ${
//     inter.style.fontFamily
//   };">
//     <div style="width: 40%">
//       <p style="font-size: 24px; font-weight: 600; margin-bottom: 6px;">${departure}</p>
//       <p style="line-height: 1.25;">${vehicle.originName}</p>
//     </div>
//     <div style="width: 20%; display: flex; justify-content: center; align-items: center;">
//       <svg width="14" height="16" viewBox="0 0 14 16" fill="none" xmlns="http://www.w3.org/2000/svg">
//         <path d="M13.7062 8.70625L8.70624 13.7062C8.51249 13.9031 8.25624 14 7.99999 14C7.74374 14 7.48812 13.9023 7.29312 13.707C6.90249 13.3164 6.90249 12.6836 7.29312 12.293L10.5875 9H0.999999C0.447812 9 4.95911e-05 8.55312 4.95911e-05 8C4.95911e-05 7.44688 0.447812 7 0.999999 7H10.5875L7.29374 3.70625C6.90312 3.31563 6.90312 2.68282 7.29374 2.29219C7.68437 1.90157 8.31718 1.90157 8.70781 2.29219L13.7078 7.29219C14.0969 7.68438 14.0969 8.31563 13.7062 8.70625Z" fill="white"/>
//       </svg>
//     </div>
//     <div style="width: 40%; text-align: end;">
//       <p style="font-size: 24px; font-weight: 600; margin-bottom: 6px;">${arrival}</p>
//       <p style="line-height: 1.25;">${vehicle.destinationName}</p>
//     </div>
//   </div>
//   <p style="font-family: ${
//     inter.style.fontFamily
//   }; margin-top: 8px; opacity: 0.5; font-size: 11px;">Updated ${formatDistanceToNow(
//     vehicle.recordedAt,
//     { addSuffix: true, includeSeconds: true },
//   )}</p>
//   <div style="display: flex; gap: 0.5rem; width: 100%;">
//     <button onClick="if(!this.classList.contains('following')) { document.body.dataset.following = '${
//       vehicle.ref
//     }'; this.classList.add('following'); document.querySelector('.maplibregl-popup-close-button').click(); } else { document.body.dataset.following = ''; this.classList.remove('following') }" ${
//       document.body.dataset.following == vehicle.ref ? 'class="following"' : ""
//     } style="font-family: ${
//       inter.style.fontFamily
//     }; flex-grow: 1; padding: 6px; outline: none; border-radius: 4px; margin-top: 8px; border: 1px solid rgba(255, 255, 255, 0.1);">Follow</button>
//     <button onClick="const url = window.location.href + '?vehicleId=${
//       vehicle.ref
//     }'; try { navigator.share({url}) } catch(e) { navigator.clipboard.writeText(url) }" style="flex-grow: 0; width: 32px; padding: 9px; border-radius: 4px; margin-top: 8px; border: 1px solid rgba(255, 255, 255, 0.1);">
//       <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 448 512"><!--!Font Awesome Free 6.7.2 by @fontawesome - https://fontawesome.com License - https://fontawesome.com/license/free Copyright 2025 Fonticons, Inc.--><path fill="#ffffff" d="M246.6 9.4c-12.5-12.5-32.8-12.5-45.3 0l-128 128c-12.5 12.5-12.5 32.8 0 45.3s32.8 12.5 45.3 0L192 109.3 192 320c0 17.7 14.3 32 32 32s32-14.3 32-32l0-210.7 73.4 73.4c12.5 12.5 32.8 12.5 45.3 0s12.5-32.8 0-45.3l-128-128zM64 352c0-17.7-14.3-32-32-32s-32 14.3-32 32l0 64c0 53 43 96 96 96l256 0c53 0 96-43 96-96l0-64c0-17.7-14.3-32-32-32s-32 14.3-32 32l0 64c0 17.7-14.3 32-32 32L96 448c-17.7 0-32-14.3-32-32l0-64z"/></svg>
//     </button>
//   </div>
// `;
// }

// function createMarker(
//   el: HTMLElement,
//   vehicle: Vehicle,
//   popup: maplibregl.Popup,
//   map: RefObject<maplibregl.Map | null>,
// ) {
//   const bearing = Number(vehicle.bearing);
//   return new maplibregl.Marker({
//     element: el,
//     rotation: Number.isNaN(bearing) ? undefined : bearing,
//     rotationAlignment: "map",
//   })
//     .setLngLat([Number(vehicle.longitude), Number(vehicle.latitude)])
//     .setPopup(popup)
//     .addTo(map.current!);
// }
