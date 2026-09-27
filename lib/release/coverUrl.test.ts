import { describe, expect, it } from "vitest";
import { DEFAULT_RELEASE_COVER, releaseCoverSrc, resolveReleaseCoverUrl } from "./coverUrl";

describe("resolveReleaseCoverUrl", () => {
  it("rejects blob and empty values", () => {
    expect(resolveReleaseCoverUrl(null)).toBeNull();
    expect(resolveReleaseCoverUrl("")).toBeNull();
    expect(resolveReleaseCoverUrl("   ")).toBeNull();
    expect(resolveReleaseCoverUrl("blob:http://localhost:3000/abc")).toBeNull();
  });

  it("accepts durable http(s), absolute paths, and data image URLs", () => {
    expect(resolveReleaseCoverUrl("/covers/default.svg")).toBe("/covers/default.svg");
    expect(resolveReleaseCoverUrl("https://cdn.example/cover.jpg")).toBe("https://cdn.example/cover.jpg");
    expect(resolveReleaseCoverUrl("http://localhost:3000/uploads/a.png")).toBe(
      "http://localhost:3000/uploads/a.png"
    );
    expect(resolveReleaseCoverUrl("data:image/png;base64,abc")).toBe("data:image/png;base64,abc");
  });

  it("falls back to the neutral default for display", () => {
    expect(releaseCoverSrc("blob:http://localhost:3000/x")).toBe(DEFAULT_RELEASE_COVER);
    expect(releaseCoverSrc("/assets/cleaver/cleaver-band.jpg")).toBe("/assets/cleaver/cleaver-band.jpg");
  });
});
