import { describe, it, expect, beforeAll } from "vitest";
import { defineLabMatrix, LabMatrix } from "../src/index.js";
import type { LabMatrixModel } from "../src/types.js";

beforeAll(() => defineLabMatrix());

const MODEL: LabMatrixModel = {
  matrix: {
    cols: [
      { id: "2025-01|Lab", date: "2025-01", labName: "Lab" },
      { id: "2026-01|Lab", date: "2026-01", labName: "Lab" },
    ],
    rows: [],
  },
  panels: [
    {
      name: "Complete blood count (CBC)",
      rows: [
        { key: "HGB", displayName: "Hemoglobin", displayShortName: "HGB", cells: [{ raw: "15.1", flag: "" }, { raw: "14.8", flag: "low" }] },
        { key: "PLT", displayName: "Platelets", displayShortName: "PLT", cells: [null, { raw: "250", flag: "" }] },
      ],
    },
  ],
};

describe("<lab-matrix> (phase 0 skeleton)", () => {
  it("registers the custom element", () => {
    expect(customElements.get("lab-matrix")).toBe(LabMatrix);
  });

  it("renders panels, rows and cells from the model into shadow DOM", () => {
    const el = document.createElement("lab-matrix") as LabMatrix;
    document.body.appendChild(el);
    el.model = MODEL;
    const sr = el.shadowRoot!;
    expect(sr).toBeTruthy();
    // panel header present
    expect(sr.querySelector(".panel-row")?.textContent).toContain("Complete blood count");
    // both analyte rows rendered
    const names = Array.from(sr.querySelectorAll(".analyte-name")).map((n) => n.textContent);
    expect(names).toEqual(["Hemoglobin", "Platelets"]);
    // date header cells
    expect(Array.from(sr.querySelectorAll("thead th")).map((t) => t.textContent)).toContain("2026-01");
    // a flagged cell carries its zone class; a missing cell is empty
    expect(sr.querySelector("td.num.low")?.textContent).toBe("14.8");
    expect(sr.querySelector("td.empty")).toBeTruthy();
    el.remove();
  });

  it("clears when the model is nulled", () => {
    const el = document.createElement("lab-matrix") as LabMatrix;
    document.body.appendChild(el);
    el.model = MODEL;
    el.model = null;
    expect(el.shadowRoot!.innerHTML).toBe("");
    el.remove();
  });
});
