import { Some, None, Optional } from "../src/optional-pattern";
import { match } from "../src/match-pattern";
import { describe, test, expect } from "vitest";

describe("testing optional pattern function", () => {
    const v1: Optional<number> = Some(1);
    const v2: Optional<number> = None();

    test("optional pattern", () => {
        expect(
            match(v1, {
                Some: (x) => x + 1,
                None: 0,
            })
        ).toBe(2);

        expect(
            match(v2, {
                Some: (x) => x + 1,
                None: 0,
            })
        ).toBe(0);
    });
});
