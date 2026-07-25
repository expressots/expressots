export type None = { tag: "None" };
export type Some<T> = { tag: "Some", value: T};
export type Optional<T> = Some<T> | None;

export function Some<T>(value: T): Some<T> {
    return { tag: "Some", value };
}

export function None(): None {
    return { tag: "None" };
}

type MatchPatterns<T, U> = {
    Some?: (value: T extends Some<infer V> ? V : never) => U;
    None?: U;
}

export function matchOptional<T extends Optional<any>, U>(value: T, patterns: MatchPatterns<T, U>): U {
    
    if (patterns[value.tag]) {
        if (value.tag === "Some") {
            return (patterns[value.tag] as (value: T extends Some<infer V> ? V : never) => U)(value.value);
        } else {
            return patterns[value.tag] as U;
        }
    }

    if (patterns["_"]) {
        return patterns["_"] as U;
    }

    throw new Error(`No match found for the given value ${value}`);
}

