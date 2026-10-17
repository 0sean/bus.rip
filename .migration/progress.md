# progress

2026-10-17, golden pair via CLI, migrated the pristine progress wrapper to Base UI.

## Changed

- src/components/ui/progress.tsx:3: uses Progress.Root, Track and Indicator; passes value to the accessible root and lets Base UI compute the fill. Exposes Label and Value parts.
- src/components/map/MapNavbar.tsx:190: preserves the 14px track height after the new Track nesting and names the progress indicator.
- .migration/progress.md: records the migration.

Leftover scan (`grep -n "radix-ui\|@radix-ui"` on these component files) is clean. Both typechecks pass.

## Left alone

The existing map refresh timer logic remains unchanged. cmdk and vaul wrappers are intentionally outside scope.

## Behavior changes

Progress now exposes its actual value to assistive technology. Base UI owns range validation and fill calculation; the old wrapper only translated its indicator and did not forward value to the accessible root.

## Verify by hand

Open tracking, watch the 14px progress indicator fill, then confirm it resets when map data refreshes. Inspect the progressbar name and current value in the accessibility tree.
