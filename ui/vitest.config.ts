import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    // web components need a DOM (customElements, HTMLElement)
    environment: "happy-dom",
    globals: true,
    // Node >= 22 owns a disabled `localStorage` global that shadows happy-dom's.
    // See test/setup-webstorage.ts — without this the suite passes on Node 18 and
    // fails 27 tests on Node 22+, purely from the runtime it happens to be run with.
    setupFiles: ["./test/setup-webstorage.ts"],
  },
});
