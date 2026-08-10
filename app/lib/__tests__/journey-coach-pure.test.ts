import { describe, expect, it } from "vitest";
import {
  coachTipFromPath,
  projectIdFromPath,
  resolveCoachCtaHref,
} from "@/lib/journey-coach-pure";

describe("journey-coach-pure", () => {
  it("maps welcome and start", () => {
    expect(coachTipFromPath("/").scene).toBe("home");
    expect(coachTipFromPath("/start").scene).toBe("start");
  });

  it("maps full project journey stages", () => {
    const id = "abc";
    expect(coachTipFromPath(`/projects/${id}`).scene).toBe("hub");
    expect(coachTipFromPath(`/projects/${id}/express`).scene).toBe("strategy");
    expect(coachTipFromPath(`/projects/${id}/name`).scene).toBe("name");
    expect(coachTipFromPath(`/projects/${id}/studio/logo`).scene).toBe("logo");
    expect(coachTipFromPath(`/projects/${id}/design`).scene).toBe("design");
    expect(coachTipFromPath(`/projects/${id}/handover`).scene).toBe("handover");
    expect(coachTipFromPath(`/projects/${id}/content`).scene).toBe("content");
  });

  it("hides on public share", () => {
    expect(coachTipFromPath("/share/tok123").scene).toBe("hidden");
    expect(coachTipFromPath("/unlock").scene).toBe("hidden");
  });

  it("resolves CTAs", () => {
    const home = coachTipFromPath("/");
    if (home.scene === "hidden") throw new Error("expected tip");
    expect(resolveCoachCtaHref(home, null)).toBe("/start");
    expect(projectIdFromPath("/projects/xyz/design")).toBe("xyz");
  });
});
