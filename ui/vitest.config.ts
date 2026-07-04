import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    // web components need a DOM (customElements, HTMLElement)
    environment: "happy-dom",
    globals: true,
  },
});
