import { describe, expect, it } from "vitest";
import {
  classifyUserAgent,
  deriveConnectionQuality,
  toBrowserFamily,
  toConnectionQuality,
  toConnectionType,
  toDeviceClass,
  toOsFamily,
  toScreenBucket,
} from "../server/core/environment";

describe("environment bucketing", () => {
  it("clamps untrusted values to allowed enums", () => {
    expect(toDeviceClass("mobile")).toBe("MOBILE");
    expect(toDeviceClass("MOBILE")).toBe("MOBILE");
    expect(toDeviceClass("supercomputer")).toBe("UNKNOWN");
    expect(toDeviceClass(42)).toBe("UNKNOWN");
    expect(toDeviceClass(undefined)).toBe("UNKNOWN");
    expect(toBrowserFamily("samsung")).toBe("SAMSUNG");
    expect(toBrowserFamily("netscape")).toBe("UNKNOWN");
    expect(toOsFamily("iOS")).toBe("IOS");
    expect(toOsFamily("amiga")).toBe("UNKNOWN");
    expect(toConnectionType("cellular")).toBe("CELLULAR");
    expect(toConnectionType("bluetooth")).toBe("UNKNOWN");
    expect(toConnectionQuality("slow_2g")).toBe("SLOW_2G");
    expect(toConnectionQuality("5g")).toBe("UNKNOWN");
  });

  it("buckets screens coarsely and rejects non-positive sizes", () => {
    expect(toScreenBucket(390)).toBe("small");
    expect(toScreenBucket(800)).toBe("medium");
    expect(toScreenBucket(1440)).toBe("large");
    expect(toScreenBucket(0)).toBeNull();
    expect(toScreenBucket(-5)).toBeNull();
    expect(toScreenBucket("abc")).toBeNull();
  });

  it("derives connection quality and only ever downgrades", () => {
    expect(deriveConnectionQuality({ effectiveType: "4g" })).toBe("G4");
    expect(deriveConnectionQuality({ effectiveType: "3g" })).toBe("G3");
    expect(deriveConnectionQuality({ effectiveType: "2g" })).toBe("G2");
    expect(deriveConnectionQuality({ effectiveType: "slow-2g" })).toBe("SLOW_2G");
    // Unsupported browser → UNKNOWN, never guessed.
    expect(deriveConnectionQuality({})).toBe("UNKNOWN");
    // Flaky-but-4g downgrades honestly.
    expect(deriveConnectionQuality({ effectiveType: "4g", rtt: 500 })).toBe("G3");
    expect(deriveConnectionQuality({ effectiveType: "4g", downlink: 0.3 })).toBe("G2");
    // Slow never upgrades.
    expect(deriveConnectionQuality({ effectiveType: "2g", downlink: 50, rtt: 1 })).toBe("G2");
  });

  it("classifies user agents into coarse buckets", () => {
    expect(classifyUserAgent("Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1")).toEqual({
      deviceClass: "MOBILE",
      browserFamily: "SAFARI",
      osFamily: "IOS",
    });
    expect(classifyUserAgent("Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36")).toEqual({
      deviceClass: "DESKTOP",
      browserFamily: "CHROME",
      osFamily: "WINDOWS",
    });
    expect(classifyUserAgent("")).toEqual({
      deviceClass: "DESKTOP",
      browserFamily: "OTHER",
      osFamily: "OTHER",
    });
  });
});
