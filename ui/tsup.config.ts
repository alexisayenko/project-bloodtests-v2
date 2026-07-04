import { defineConfig } from "tsup";

export default defineConfig({
  entry: ["src/index.ts"],
  format: ["esm"],
  dts: true,
  clean: true,
  sourcemap: true,
  target: "es2022",
  outDir: "dist",
  // ship self-contained: chart-kit (which bundles uPlot) folds into this file
  // so static-site consumers keep vendoring exactly one script
  noExternal: ["@alexisayenko/chart-kit"],
});
