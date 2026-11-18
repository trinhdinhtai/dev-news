import { describe, expect, it } from "vitest";
import en from "./messages/en.json";
import vi from "./messages/vi.json";

/** Every message's dotted key path, such as "Nav.overview". */
function keyPaths(messages: object, prefix = ""): string[] {
  return Object.entries(messages).flatMap(([key, value]) =>
    typeof value === "object" && value !== null ? keyPaths(value, `${prefix}${key}.`) : [`${prefix}${key}`],
  );
}

describe("Interface messages", () => {
  it("has a Vietnamese message for every English one, and nothing more", () => {
    expect(keyPaths(vi).toSorted()).toEqual(keyPaths(en).toSorted());
  });
});
