import { match } from "./match-pattern";

const enum Coin {
    Penny,
    Nickel,
    Dime,
    Quarter
}

function valueInCents(coin: Coin): number {
    return match(coin, {
        [Coin.Penny]: () => 1,
        [Coin.Nickel]: () => 5,
        [Coin.Dime]: () => 10,
        [Coin.Quarter]: () => 25,
    })
}

console.log("The value is: ", valueInCents(Coin.Penny)); // 1

let isOn: boolean = true;

const result = match(isOn, {
    true: () => "The light is on",
    false: () => "The light is off",
});

console.log(result); // The light is off

const result2 = match("a", {
    "1..=13": () => "Between 1 and 13",
    "25 | 50 | 100": () => "A bill",
    "a..=d": () => "A letter",
    "/[a-z]/": () => "A lowercase letter",
    "_": () => "Default",
});

console.log(result2); // One

// EXAMPLES OF USE OF THE MATCH PATTERN FUNCTION

/*
const result = match(0, {
    0: () => "this is 0",
    [RGB.Red] : () => "this is enum",
    99: () => "this is 99",
    "11..=22": () => "this number is in between 11 and 22",
    "/abc/": () => "this is a regex",
    "2 | 3 | 5 | 8": () => "this number is a prime number",
    false: () => "this is a boolean",
    "a..=d": () => "this is a char",
    "_": () => "this is the default case"
});
*/