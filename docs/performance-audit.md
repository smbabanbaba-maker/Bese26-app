

## Local smoke test

The optimized local app loaded Home with real approved listings and the seven-item fixed navigation. The browser console showed no runtime errors beyond the standard React DevTools information message. Opening a listing triggered on-demand detail hydration and preserved the full three-image gallery, confirming that only the first image is signed for list cards while full media remains available on detail open.


## Measured optimization results

The baseline production build had an initial JavaScript bundle of 500.22 kB (141.99 kB gzip). After lazy-loading Profile, Admin, and Sell screens, the initial bundle measured 444.99 kB (127.33 kB gzip), with separate route chunks for those screens. This is approximately an 11% reduction in initial JavaScript transfer before browser compression differences.

The public listing query was reduced from 50 to 24 rows, its select list now names only required fields instead of `*`, and list cards sign only the first image through one batched Storage request. Full listing media is loaded on demand when a user opens a card. Card and saved-list images use native lazy loading and asynchronous decoding.


## Accessibility and runtime smoke test

The optimized local Home rendered all seven bottom navigation items and seven real approved listings. Product cards now expose keyboard semantics with `role="button"`, `tabIndex="0"`, Enter/Space activation, and visible focus styling. Navigation buttons expose `aria-current` for the active page. The browser console showed no runtime errors during Home load and listing-detail navigation.
