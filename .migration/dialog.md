# dialog

2026-10-17, golden pair via merge (manual replay), migrated dialog while preserving the local font-heading class, Lucide icon and import aliases.

## Changed

- src/components/ui/dialog.tsx:4: replaces Radix Content/Overlay with Base UI Popup/Backdrop and migrates both close buttons to render composition. Retains the original ReactNode-only children API so CommandDialog does not inherit Base UI payload render functions that it cannot render inside its content.
- .migration/dialog.md: records the migration.

Leftover scan (`grep -n "radix-ui\|@radix-ui"` on dialog.tsx) is clean. Both typechecks pass. The application consumer sweep found no direct Dialog usages; CommandDialog inherits the new root props and typechecks unchanged.

## Left alone

src/components/ui/command.tsx uses cmdk and is intentionally untouched. src/components/ui/drawer.tsx uses vaul and is intentionally untouched.

## Behavior changes

Focus management and dismissal now follow Base UI. Event-based autofocus and outside-interaction hooks are replaced by initialFocus/finalFocus and root change-event details; no existing consumer used those hooks. Portals introduce a wrapper element.

## Verify by hand

Render a dialog with title, description and a focusable input. Open with keyboard, confirm focus trapping, then close using Escape, the icon button and the footer button. Confirm focus returns to the trigger and background scrolling is restored.
