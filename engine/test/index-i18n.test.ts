import { describe, it, expect } from "vitest";
import { INDEX_DEFS } from "../src/indices/definitions.js";

describe("IndexCatalog — Russian (ru) localization", () => {
  it("every index carries a non-empty lang.ru name / meaning / consensus", () => {
    for (const d of INDEX_DEFS) {
      const ru = d.lang?.ru;
      expect(ru, `missing lang.ru for "${d.key}"`).toBeDefined();
      expect(ru!.name?.length, `empty ru.name for "${d.key}"`).toBeGreaterThan(0);
      expect(ru!.meaning?.length, `empty ru.meaning for "${d.key}"`).toBeGreaterThan(0);
      expect(ru!.consensus?.length, `empty ru.consensus for "${d.key}"`).toBeGreaterThan(0);
    }
  });

  it("EVERY index is translated — no untranslated index can be added", () => {
    // Was a hardcoded 23. The magic number added nothing the loop above did not
    // already assert, and it failed for the one reason that is not a bug: a new
    // index (HOMA-%B) arriving fully translated. The invariant is "all of them".
    const translated = INDEX_DEFS.filter((d) => d.lang?.ru?.name);
    expect(translated).toHaveLength(INDEX_DEFS.length);
  });
});
