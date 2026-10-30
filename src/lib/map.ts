function renderHours(time?: string) {
  return time != undefined
    ? new Date(time).getHours().toString().padStart(2, "0")
    : "-";
}

function renderMinutes(time?: string) {
  return time != undefined
    ? new Date(time).getMinutes().toString().padStart(2, "0")
    : "-";
}

export function renderTime(time?: string) {
  return `${renderHours(time)}:${renderMinutes(time)}`;
}
