type MatchPatterns<T> = {
    [key: string]: () => T;
}

export function match<T>(value: any, patterns: MatchPatterns<T>): T {

    for (const p in patterns) {
        const patternKey = String(p);
        const isRange = patternKey.includes("..=");
        const isOr = patternKey.includes("|");
        const isRegex = patternKey.startsWith("/") && patternKey.endsWith("/");
        
        if (isRange) {
            const [start, end] = patternKey.split("..=").map(s => isNaN(Number(s)) ? s : Number(s));

            if ((typeof value === "number" && typeof start === "number" && typeof end === "number" && value >= start && value <= end) ||
                (typeof value === "string" && typeof start === "string" && typeof end === "string" && value >= start && value <= end)) {
                return patterns[p]();
            }
        } else if (isOr) {
            const patternValues = patternKey.split("|").map(s => isNaN(Number(s)) ? s : Number(s));
            
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
