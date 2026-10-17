# Project migration

2026-10-17 — migrated all six Radix UI wrappers from radix-nova to base-nova.

## Scope and strategy

The shadcn CLI info command confirmed TanStack Start, Tailwind v4, radix-nova, pnpm and the src/components/ui alias. Registry source comparison found button/progress pristine and the other four wrappers differing only in client directives, resolved imports/icons, font classes and removed registry menu hooks. Pristine files used shadcn add individually; the other files use the matching Base UI golden source with those local differences manually replayed. No bulk overwrite was used.

The work ran on an isolated clean worktree because the original directory contained untracked skill-installation files. Those files were preserved. Each migrated component has its own commit and report.

## Dependencies and configuration

- components.json now selects base-nova so future shadcn additions use Base UI.
- @base-ui/react ^1.9.0 was already installed and retained.
- Removed radix-ui and all six direct @radix-ui/react-* dependencies only after migrating the final wrapper.
- Retained cmdk and vaul and their required transitive Radix dependencies. Their wrappers are byte-for-byte unchanged.
- pnpm-lock.yaml is authoritative and updated. Removed the stale yarn.lock; it is recoverable from git history.
- package.json build now invokes pnpm typecheck instead of Yarn, matching packageManager and fixing the baseline runner mismatch.
- Added the base-nova dropdown-menu wrapper required by the registry's menubar composition.

## Consumer sweep

Searched all src files for Radix imports, asChild, positioning variables, old autofocus/outside-interaction callbacks, tooltip delays, menu item callbacks and other removed props. Migrated the combobox input-group button composition and map Fares tooltip trigger to render. Preserved the map refresh indicator's 14px track height after Base UI added a Track part. The existing cmdk CommandDialog remains compatible because Dialog retains ReactNode-only children. Timetable tooltip consumers already match the target API.

Only vaul consumers retain asChild, intentionally. No source file imports Radix directly. PopoverAnchor is an inert compatibility div; no consumer uses it. Tooltip offset/timing, menu loop/close defaults and focus API changes are documented in the respective reports.

## Verification

- Baseline: both TypeScript configurations passed. Vite built client and server bundles, but pnpm build exited nonzero because its final step invoked Yarn despite packageManager selecting pnpm. Wrangler also attempted to write logs outside the writable sandbox.
- Each component passed both TypeScript checks after migration. Dialog's inferred function-valued children exposed a cmdk consumer mismatch; restricting the public children type resolved it without editing cmdk.
- Final pnpm build passed for both backends: Postgres in the isolated worktree, then the original directory's existing D1 configuration after pnpm install --frozen-lockfile. Both TypeScript configurations passed as part of each build. D1 verification used WRANGLER_LOG_PATH=/tmp/bus-base-wrangler to keep logs in the writable sandbox. Existing chunk-size, Sentry mixed-import and Postgres module-directive build warnings remain.
- Existing Vitest suite: 2 files, 19 tests passed.
- ESLint passed for all changed TSX files; git diff --check passed.
- Chrome checks through an isolated Vite harness passed: ordinary/submit button types; dialog Escape, footer close and focus return; popover side/offset forwarding; tooltip hover, bottom placement and dismissal; menu typeahead, checked state, stay-open default and submenu; progress accessible value, 14px track and 40% fill; combobox selection and absence of nested buttons; unchanged cmdk CommandDialog opening/closing.
- The browser harness reported no console or runtime errors. Harness files are temporary under /tmp/bus-base-qa, outside the repository. These checks exercise UI primitives and their local consumers; they do not claim production data-feed or database verification.

Derived scan of src/components/ui: 0 wrappers remain on Radix.
