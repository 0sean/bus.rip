# menubar

2026-10-17, golden pair via merge (manual replay), migrated to Base UI Menubar and the registry's shared dropdown-menu wrappers.

## Changed

- src/components/ui/menubar.tsx:4: uses the Base UI Menubar container, delegates menu composition to dropdown-menu and splits checkbox/radio indicators. Preserves local Lucide icons and removal of registry-only cn-menu styling hooks.
- src/components/ui/dropdown-menu.tsx:1: adds the base-nova registry dependency with positioned popups, submenu defaults and Lucide icon resolution.
- .migration/menubar.md: records the migration.

Leftover scan (`grep -n "radix-ui\|@radix-ui"` on both wrappers) is clean. Both typechecks pass. MapNavbar consumers use only Menu and Trigger and need no prop changes.

## Left alone

src/components/map/MapNavbar.tsx navigation behavior remains intact. cmdk and vaul wrappers are intentionally untouched.

## Behavior changes

Checkbox and radio menu items stay open on click by default in Base UI. Menubar keyboard navigation loops by default. Active menus are controlled through each Menu's open prop, rather than a Menubar value. These registry defaults are retained; no current consumer uses checkbox/radio items or controls the active menu.

## Verify by hand

Click the map navbar back button. Render a menu with several items and a submenu; check arrow keys, typeahead, Escape, disabled items and focus return. Toggle a checkbox item and confirm the documented stay-open default.
