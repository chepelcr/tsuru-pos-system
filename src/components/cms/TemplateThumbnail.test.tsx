import { fireEvent, render, screen } from "@testing-library/react";
import { existsSync, statSync } from "node:fs";
import { beforeEach, describe, expect, it } from "vitest";
import { LanguageProvider } from "@/contexts/LanguageContext";
import { BUNDLED_TEMPLATE_PREVIEWS, TemplateThumbnail, templateThumbnailUrl } from "./TemplateThumbnail";
import type { Template } from "@/types";

const template: Template = { id: "template-1", name: "tech-gadgets", display_name: "Tech Gadgets", description: "Electronics", category: "technology", is_active: true, sort_order: 1 };
beforeEach(() => localStorage.setItem("language", "en"));

describe("template previews", () => {
  it.each(BUNDLED_TEMPLATE_PREVIEWS)("ships an actual preview for %s", (name) => {
    const url = templateThumbnailUrl({ name, thumbnail_url: "/missing-old-preview.jpg" });
    expect(url).toBe(`/templates/${name}.jpg`);
    expect(existsSync(`public${url}`)).toBe(true);
    expect(statSync(`public${url}`).size).toBeGreaterThan(10000);
  });

  it("shows a centered fallback instead of a broken image after loading fails", () => {
    render(<LanguageProvider><TemplateThumbnail template={template} /></LanguageProvider>);
    fireEvent.error(screen.getByRole("img"));
    expect(screen.queryByRole("img")).toBeNull();
    expect(screen.getByText("Tech Gadgets")).toBeTruthy();
  });

  it("keeps custom template images and does not invent missing asset URLs", () => {
    expect(templateThumbnailUrl({ name: "custom-design", thumbnail_url: "https://example.com/preview.jpg" })).toBe("https://example.com/preview.jpg");
    expect(templateThumbnailUrl({ name: "custom-design" })).toBeUndefined();
  });
});
