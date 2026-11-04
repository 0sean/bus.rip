export function FareMapPlaceholder({ tall = false }: { tall?: boolean }) {
  return (
    <div
      role="status"
      className={`${tall ? "h-[352px] lg:h-[648px]" : "h-[352px]"} rounded-[14px] border bg-muted/30 flex items-center justify-center text-sm text-muted-foreground`}
    >
      Loading fare map…
    </div>
  );
}
