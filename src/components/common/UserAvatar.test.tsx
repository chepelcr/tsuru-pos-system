import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { UserAvatar } from "./UserAvatar";

describe("UserAvatar", () => {
  it("falls back to initials on a broken photo and retries when the photo changes", () => {
    const { rerender } = render(<UserAvatar src="https://example.com/old.png" name="María Rodríguez" alt="Foto" />);
    fireEvent.error(screen.getByRole("img"));
    expect(screen.getByText("MR")).toBeTruthy();
    rerender(<UserAvatar src="https://example.com/new.png" name="María Rodríguez" alt="Foto" />);
    expect(screen.getByRole("img").getAttribute("src")).toBe("https://example.com/new.png");
  });
});
