# Bese26 mobile cleanup check

Date: 2026-08-27

The local build at `http://localhost:5176/` was checked after removing the Home discovery banner and deleting the unused legacy demo-data module. The live DOM contained no `.discovery-banner`, no visible `Wallet` or `AI` text, and the bottom navigation contained only **Home**, **Saved**, **Sell**, **Messages**, and **Profile**. The browser reported no horizontal overflow: `document.scrollWidth` was below `window.innerWidth`.

The production-style local Home now begins with the header and search field, followed by the approved-listings state; the dark promotional banner and decorative accent are no longer rendered. The local Vite build and `git diff --check` passed after the cleanup.
