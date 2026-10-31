import { describe, expect, it } from "vitest";
import { localizeTemplate } from "./localizeTemplate";

const base = { display_name: "Panadería", description: "Plantilla cálida para panaderías." };
const translations = {
  es: { display_name: "Panadería", tagline: "Una vitrina cálida.", description: "Tonos de corteza.", features: ["Vitrina por categorías"] },
  en: { display_name: "Bakery", tagline: "A warm display case.", description: "Crust tones." },
};

describe("localizeTemplate", () => {
  it("uses the reader's language", () => {
    const copy = localizeTemplate({ ...base, translations }, "en");
    expect(copy).toMatchObject({ displayName: "Bakery", tagline: "A warm display case.", description: "Crust tones." });
  });

  it("falls back to Spanish field by field", () => {
    expect(localizeTemplate({ ...base, translations }, "en").features).toEqual(["Vitrina por categorías"]);
    expect(localizeTemplate({ ...base, translations }, "fr").displayName).toBe("Panadería");
  });

  it("falls back to the base columns without translations", () => {
    const copy = localizeTemplate({ ...base, translations: null }, "en");
    expect(copy).toEqual({ displayName: "Panadería", tagline: null, description: "Plantilla cálida para panaderías.", idealFor: [], features: [] });
  });
});
