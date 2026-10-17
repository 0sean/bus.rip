# button

2026-10-17, golden pair via CLI, migrated the pristine radix-nova button to the matching Base UI primitive.

## Changed

- src/components/ui/button.tsx:1: uses @base-ui/react/button and its render composition API, retaining Nova variants and sizes.
- src/components/ui/combobox.tsx:70: composes its trigger with render and InputGroupButton, preserving one button element.
- components.json:3: selects base-nova for this whole-project migration.
- .migration/button.md: records this migration.

Leftover scan (`grep -n "radix-ui\|@radix-ui"` on the changed component files) is clean. Both project typechecks pass.

## Left alone

InputGroupButton already inherits Button props. Drawer and command wrappers remain unchanged because vaul and cmdk are outside the Radix migration. Radix Close asChild composition in the existing dialog stays valid until its own migration.

## Behavior changes

Button defaults to type="button" through Base UI. Submit consumers explicitly set type="submit". Polymorphic composition uses render; non-button targets require nativeButton={false}.

## Verify by hand

Tab to the operator picker and tracking form. Open the picker with Enter, verify disabled/loading states, and submit the form. Check the input-group trigger has one focusable button and opens the list.
