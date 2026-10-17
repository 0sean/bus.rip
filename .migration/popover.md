# popover

2026-10-17, golden pair via merge (manual replay), migrated to base-nova while preserving the omitted client directive and public Anchor export.

## Changed

- src/components/ui/popover.tsx:3: uses Popover.Root, Trigger, Positioner and Popup; explicitly forwards side, sideOffset, align and alignOffset to Positioner. Title and Description use accessible Base UI parts.
- src/components/ui/popover.tsx:54: retains PopoverAnchor as an inert native div because Base UI has no standalone Anchor part.
- .migration/popover.md: records the migration.

Leftover scan (`grep -n "radix-ui\|@radix-ui"` on the wrapper) is clean. Both typechecks pass. The app consumer sweep found no Popover usage.

## Left alone

cmdk and vaul wrappers are intentionally outside scope. No application consumers needed changes.

## Behavior changes

PopoverAnchor no longer controls positioning. No current consumer imports it. Future separate anchors require a Positioner anchor ref and an explicit wrapper API change. Title now renders the Base UI heading and associates the popup label automatically.

## Verify by hand

Render a popover with trigger, title and description. Open it with Enter, check alignment at viewport edges, close with Escape and verify focus returns to the trigger.
