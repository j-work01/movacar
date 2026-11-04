// jsdom (the browser stand-in for tests) lacks ResizeObserver, which the
// menu and dialog components use to measure themselves.
globalThis.ResizeObserver ??= class {
  observe() {}
  unobserve() {}
  disconnect() {}
}

// jsdom doesn't lay pages out, so every element measures 0×0, and the
// virtualized table would think nothing fits on screen. Give elements a
// screen-sized box instead. (Tests of the refresh script run without a DOM.)
if (typeof HTMLElement !== 'undefined') {
  Object.defineProperties(HTMLElement.prototype, {
    clientHeight: { configurable: true, get: () => 800 },
    clientWidth: { configurable: true, get: () => 1200 },
  })
}
