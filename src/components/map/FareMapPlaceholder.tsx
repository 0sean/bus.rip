export function FareMapPlaceholder({
  tall = false,
  overview = false,
}: {
  tall?: boolean;
  overview?: boolean;
}) {
  return (
    <div
      role="status"
      className={`${overview ? "h-[352px] lg:h-[565px]" : tall ? "h-[var(--fare-zone-map-height,648px)]" : "h-[352px]"} rounded-[14px] border bg-muted/30 flex items-center justify-center text-sm text-muted-foreground`}
    >
      Loading fare map…
    </div>
  );
}
