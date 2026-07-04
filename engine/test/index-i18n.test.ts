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

  it("all 23 indices are translated", () => {
    const translated = INDEX_DEFS.filter((d) => d.lang?.ru?.name);
    expect(translated).toHaveLength(23);
  });
});
