<p align="center">
  <a href="https://expresso-ts.com/" target="blank"><img src="https://github.com/expressots/expressots/blob/main/media/alogo.png" width="120" alt="Expresso TS Logo" /></a>
</p>

# Boost-TS

Boost is a collection of libraries for the TypeScript programming language designed to enhance its capabilities across various domains. These libraries provide a wide range of functionality, enabling developers to leverage the full potential of TypeScript and streamline their development process. With Boost, TypeScript developers can efficiently tackle complex tasks, improve code readability, and maintainability, while also benefiting from advanced features and best practices.

## Available Libraries

- Match Pattern
- Optional Pattern

## Installation

```bash
npm i @expressots/boost-ts
```

## Match Pattern Usage

- Using Match pattern with enums

```typescript
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

console.log(valueInCents(Coin.Penny)); // 1
```

- Using Match pattern with numbers

```typescript
let isNumber: number = 1;

const result = match(isNUmber, {
  1: () => "1",
  2: () => "2",
  "_": () => "No number found"
});

console.log(result); // The light is off
```

- Using Match pattern with boolean

```typescript
let isOn: boolean = true;

const result = match(isOn, {
  true: () => "The light is on",
  false: () => "The light is off",
});

console.log(result); // The light is off
```

- Using Match pattern with Optional pattern

```typescript
import { Some, None, Optional, matchOptional } from "./optional-pattern";
import { match } from "./match-pattern";

const v1: Optional<number> = Some(1);
const v2: Optional<number> = None();

const result = match(v1, {
    Some: (x) => x + 1,
    None: 0,
});

console.log(result); // 2
```

- Other possible combinations
  - "expressions..=expressions" -> numbers or characters
  - "isOr: this | that | other"
  - "Regex: "/[a-z]/"

```typescript
const result = match("a", {
  "1..=13": () => "Between 1 and 13",
  "25 | 50 | 100": () => "A bill",
  "a..=d": () => "A letter",
  "/[a-z]/": () => "A lowercase letter",
  "_": () => "Default",
});
console.log(result); // A letter
```

## Optional Pattern Usage

```typescript
const someValue: Optional<number> = Some(1);

function plusOne(x: Optional<number>): number {
    return match(x, {
        Some: (x) => x + 3,
        None: 0,
    })
}

console.log(plusOne(None())); // 0
```

## Contributing

Pull requests are welcome. For major changes, please open an issue first to discuss what you would like to change.

Please make sure to update tests as appropriate.

## License

[MIT](https://choosealicense.com/licenses/mit/)
