/**
 * Make Web Storage reachable as a global inside tests, on any Node version.
 *
 * The bug this fixes: the same suite is green on Node 18 and fails 27 tests on Node 22+,
 * with no code change in between — purely from the runtime it happens to be run with.
 *
 * Why. Node >= 22 ships its OWN `globalThis.localStorage` / `sessionStorage`: an own
 * accessor property that returns `undefined` unless the process was started with
 * `--localstorage-file`. Node 18 defines no such property at all. vitest's happy-dom
 * environment builds the DOM by copying the happy-dom window's properties onto
 * `globalThis` — but it will not clobber a global Node already owns, so on Node >= 22 the
 * native, disabled accessor survives and happy-dom's real Storage never lands. And because
 * that environment makes `window` an alias of `globalThis`, `window.localStorage` is the
 * very same dead accessor — so there is nothing to copy back from, either.
 *
 * The fix therefore has to bring its own Storage. We take one from a real happy-dom
 * `Window` (the same implementation the environment would have installed) and bind it over
 * the native accessor, which is `configurable: true` and so can be redefined.
 *
 * Test-environment shim only — nothing here reaches the browser bundle.
 */
import { Window } from "happy-dom";

const donor = new Window();

for (const key of ["localStorage", "sessionStorage"] as const) {
  // Only step in when the global is missing or disabled — if a runtime (or a future
  // vitest) provides a working Storage, leave it alone.
  if ((globalThis as Record<string, unknown>)[key] == null) {
    Object.defineProperty(globalThis, key, {
      value: donor[key],
      configurable: true,
      writable: true,
    });
  }
}
