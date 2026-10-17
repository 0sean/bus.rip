# tooltip

2026-10-17, golden pair via merge (manual replay), migrated to base-nova while preserving the source's omitted client directive.

## Changed

- src/components/ui/tooltip.tsx:1: uses Tooltip.Provider delay, Positioner and Popup, with all four positioning props forwarded. Uses the current registry's arrow placement and Base UI transform origin.
- src/components/map/MapNavbar.tsx:151: replaces asChild with render={<div />}, retaining the disabled Fares tab's layout and content.
- .migration/tooltip.md: records the migration.

Leftover scan (`grep -n "radix-ui\|@radix-ui"` on the affected component files) is clean. Both typechecks pass. Timetable consumers were swept and need no prop changes.

## Left alone

Timetables.tsx already uses the default button trigger API. Drawer asChild props remain because vaul is intentionally unchanged. cmdk remains unchanged.

## Behavior changes

The registry's default sideOffset changes from 0 to 4px. Tooltip providers expose delay instead of delayDuration. No provider was present in the application before migration; primitive hover timing therefore follows Base UI defaults (600ms). Tooltip arrow geometry follows the Base UI registry.

## Verify by hand

Hover the disabled Fares tab and verify the tooltip appears below it. In timetables, hover and keyboard-focus the additional-routes button; check its text, arrow, dismissal and placement near viewport edges.
