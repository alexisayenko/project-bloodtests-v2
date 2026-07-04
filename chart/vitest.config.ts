import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    // the harness touches DOM (tooltip div, localStorage, pointer events)
    environment: "happy-dom",
    globals: true,
  },
});
