import { None, Some } from "./optional-pattern";

function isSome(value: any): value is Some<any> {
    return value && value.tag === "Some";
}

function isNone(value: any): value is None {
    return value && value.tag === "None";
}

type OptionalPattern<T, U> = {
    Some?: (value: U) => T;
    None?: T;
};

type MatchPatterns<T, U> =
    | {
          [key: string]: () => T;
      }
    | OptionalPattern<T, U>;

export function match<T, U = never>(value: any, patterns: MatchPatterns<T, U>): T {
    if (isSome(value) && patterns.Some) {
        return patterns.Some(value.value);
    } else if (isNone(value) && patterns.None !== undefined) {
        return patterns.None as T;
    }

    for (const p in patterns) {
        if (p === "Some" || p === "None") continue;

        const patternKey = String(p);
        const isRange = patternKey.includes("..=");
        const isOr = patternKey.includes("|");
        const isRegex = patternKey.startsWith("/") && patternKey.endsWith("/");

        if (isRange) {
            const [start, end] = patternKey
                .split("..=")
                .map((s) => (isNaN(Number(s)) ? s : Number(s)));

            if (
                (typeof value === "number" &&
                    typeof start === "number" &&
                    typeof end === "number" &&
                    value >= start &&
                    value <= end) ||
                (typeof value === "string" &&
                    typeof start === "string" &&
                    typeof end === "string" &&
                    value >= start &&
                    value <= end)
            ) {
                return patterns[p]();
            }
        } else if (isOr) {
            const patternValues = patternKey
                .split("|")
                .map((s) => (isNaN(Number(s)) ? s : Number(s)));

            if (patternValues.includes(value)) {
                return patterns[p]();
            }
        } else if (isRegex) {
            const regex = new RegExp(patternKey.slice(1, -1));

            if (regex.test(value)) {
                return patterns[p]();
            }
        } else {
            if (value.toString() === patternKey) {
                return patterns[p]();
            }
        }
    }

    if (patterns["_"]) {
        return patterns["_"]();
    }

    throw new Error(`No match found for the given value ${value}`);
}
