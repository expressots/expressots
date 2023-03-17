import { match } from '../src/match-pattern';

describe('testing match pattern function', () => {

  const matchValidates = {
    0: () => "this is 0",
    99: () => "this is 99",
    "11..=22": () => "this number is in between 11 and 22",
    "/abc/": () => "this is a regex",
    "2 | 3 | 5 | 8": () => "this number is a prime number",
    false: () => "this is a boolean",
    "a..=d": () => "this is a char",
    "1..=13": () => "Between 1 and 13",
    "25 | 50 | 100": () => "A bill",
    "/[a-z]/": () => "A lowercase letter",
    "_": () => "default",
  };

  const enum Coin {
    Penny,
    Nickel,
    Dime,
    Quarter
  }

  test('match pattern - validates', () => {
    expect(match(0, matchValidates)).toBe("this is 0");
    expect(match(99, matchValidates)).toBe("this is 99");
    expect(match(11, matchValidates)).toBe("this number is in between 11 and 22");
    expect(match(/abc/, matchValidates)).toBe("this is a regex");
    expect(match(false, matchValidates)).toBe("this is a boolean");
    expect(match("a", matchValidates)).toBe("this is a char");
    expect(match(5, matchValidates)).toBe("this number is a prime number");
    expect(match(10, matchValidates)).toBe("Between 1 and 13");
    expect(match(25, matchValidates)).toBe("A bill");
    expect(match("z", matchValidates)).toBe("A lowercase letter");
    expect(match("1", matchValidates)).toBe("default");
  });

  test('match pattern - enum', () => {
    expect(match(Coin.Dime, {
      [Coin.Penny]: () => 1,
      [Coin.Nickel]: () => 5,
      [Coin.Dime]: () => 10,
      [Coin.Quarter]: () => 25,
    })).toBe(10);
  });
});