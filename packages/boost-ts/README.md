# Boost-TS

Boost a set of libraries for the Typescript programming language that extends the language capability in several areas

OBS.: WIP -> Work in Progress

## Installation

Currently unavailable

```bash
npm install
```

## Usage

```js
import { match } from "./match-pattern";
```

```js
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

```js
let isOn: boolean = true;

const result = match(isOn, {
  true: () => "The light is on",
  false: () => "The light is off",
});

console.log(result); // The light is off
```

Other Examples

```js
const result = match("a", {
  "1..=13": () => "Between 1 and 13",
  "25 | 50 | 100": () => "A bill",
  "a..=d": () => "A letter",
  "/[a-z]/": () => "A lowercase letter",
  _: () => "Default",
});
console.log(result); // A letter
```

## Contributing

Pull requests are welcome. For major changes, please open an issue first
to discuss what you would like to change.

Please make sure to update tests as appropriate.

## License

[MIT](https://choosealicense.com/licenses/mit/)
