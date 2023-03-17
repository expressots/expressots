type None = { tag: "None" };
type Some<T> = { tag: "Some", value: T};
type Optional<T> = Some<T> | None;

function Some<T>(value: T): Some<T> {
    return { tag: "Some", value };
}

function None(): None {
    return { tag: "None" };
}

type MatchPatterns<T, U> = {
    Some?: (value: T extends Some<infer V> ? V : never) => U;
    None?: U;
}

function matchOptional<T extends Optional<any>, U>(value: T, patterns: MatchPatterns<T, U>): U {
    
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

// example
const value1: Optional<number> = Some(1);
const value2: Optional<number> = None();

const result = matchOptional(value1, {
    Some: (x) => x + 1,
    None: 0,
});

console.log(result); // 2

function plusOne(x: Optional<number>): number {
    return matchOptional(x, {
        Some: (x) => x + 1,
        None: 0,
    });
}