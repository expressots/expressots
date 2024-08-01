<a name="readme-top"></a>

<!-- PROJECT SHIELDS -->

[![Codecov][codecov-shield]][codecov-url]
[![NPM][npm-shield]][npm-url]
![Build][build-shield]
[![Contributors][contributors-shield]][contributors-url]
[![Forks][forks-shield]][forks-url]
[![Stargazers][stars-shield]][stars-url]
[![Issues][issues-shield]][issues-url]
[![MIT License][license-shield]][license-url]
[![LinkedIn][linkedin-shield]][linkedin-url]

<!-- PROJECT LOGO -->
<br />
<div align="center">
  <a href="https://github.com/othneildrew/Best-README-Template">
    <img src="https://github.com/expressots/expressots/blob/main/media/expressots.png" alt="Logo" width="120">
  </a>

  <h3 align="center">ExpressoTS Framework</h3>

  <p align="center">
    Everything you need to know to build applications with ExpressoTS
    <br />
    <a href="https://doc.expresso-ts.com/"><strong>Explore the docs »</strong></a>
    <br />
    <br />
    <a href="https://github.com/expressots/expressots/discussions">Let's discuss</a>
    ·
    <a href="https://github.com/expressots/expressots/issues">Report Bug</a>
    ·
    <a href="https://github.com/expressots/expressots/issues">Request Feature</a>
  </p>
</div>

<!-- TABLE OF CONTENTS -->
<details>
  <summary>Table of Contents</summary>
  <ol>
    <li><a href="#about-the-project">About The Project</a></li>
    <li><a href="#getting-started">Getting Started</a></li>
    <li><a href="#contributing">Contributing</a></li>
    <li><a href="#support-the-project">Support the project</a></li>
    <li><a href="#license">License</a></li>
  </ol>
</details>

<!-- ABOUT THE PROJECT -->

# About The Project

ExpressoTS is a [Typescript](https://www.typescriptlang.org/) + [Node.js](https://nodejs.org/en/) lightweight framework for quick building scalable, easy to read and maintain, server-side applications 🐎

## Getting Started

-   Here is our [Site](https://expresso-ts.com/)
-   You can find our [Documentation here](https://doc.expresso-ts.com/)
-   Checkout our [First Steps documentation](https://doc.expresso-ts.com/docs/overview/first-steps)
-   Our [CLI Documentation](https://doc.expresso-ts.com/docs/cli/overview)

## Boost-TS

Boost is a collection of libraries for the TypeScript programming language designed to enhance its capabilities across various domains. These libraries provide a wide range of functionality, enabling developers to leverage the full potential of TypeScript and streamline their development process. With Boost, TypeScript developers can efficiently tackle complex tasks, improve code readability, and maintainability, while also benefiting from advanced features and best practices.

## Available Libraries

-   Match Pattern
-   Optional Pattern

## Installation

```bash
npm i @expressots/boost-ts
```

## Match Pattern Usage

-   Using Match pattern with enums

```typescript
import { match } from "./match-pattern";

const enum Coin {
    Penny,
    Nickel,
    Dime,
    Quarter,
}

function valueInCents(coin: Coin): number {
    return match(coin, {
        [Coin.Penny]: () => 1,
        [Coin.Nickel]: () => 5,
        [Coin.Dime]: () => 10,
        [Coin.Quarter]: () => 25,
    });
}

console.log(valueInCents(Coin.Penny)); // 1
```

-   Using Match pattern with numbers

```typescript
let isNumber: number = 1;

const result = match(isNUmber, {
    1: () => 1,
    2: () => 2,
    _: () => "No number found",
});

console.log(result); // 1
```

-   Using Match pattern with boolean

```typescript
let isOn: boolean = true;

const result = match(isOn, {
    true: () => "The light is on",
    false: () => "The light is off",
});

console.log(result); // The light is off
```

-   Using Match pattern with Optional pattern

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

-   Other possible combinations
    -   "expressions..=expressions" -> numbers or characters
    -   "isOr: this | that | other"
    -   "Regex: "/[a-z]/"

```typescript
const result = match("a", {
    "1..=13": () => "Between 1 and 13",
    "25 | 50 | 100": () => "A bill",
    "a..=d": () => "A letter",
    "/[a-z]/": () => "A lowercase letter",
    _: () => "Default",
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
    });
}

console.log(plusOne(None())); // 0
```

## Contributing

Welcome to the ExpressoTS community, a place bustling with innovative minds just like yours. We're absolutely thrilled to have you here!
ExpressoTS is more than just a TypeScript framework; it's a collective effort by developers who are passionate about creating a more efficient, secure, and robust web ecosystem. We firmly believe that the best ideas come from a diversity of perspectives, backgrounds, and skills.

Why Contribute to Documentation?

-   **Share Knowledge**: If you've figured out something cool, why keep it to yourself?
-   **Build Your Portfolio**: Contributing to an open-source project like ExpressoTS is a great way to showcase your skills.
-   **Join a Network**: Get to know a community of like-minded developers.
-   **Improve the Product**: Help us fill in the gaps, correct errors, or make complex topics easier to understand.

Ready to contribute?

-   [Contributing Guidelines](https://github.com/expressots/expressots/blob/main/CONTRIBUTING.md)
-   [How to Contribute](https://github.com/expressots/expressots/blob/main/CONTRIBUTING_HOWTO.md)
-   [Coding Guidelines](https://github.com/rsaz/TypescriptCodingGuidelines)

## Support the project

ExpressoTS is an independent open source project with ongoing development made possible thanks to your support. If you'd like to help, please consider:

-   Become a **[sponsor on GitHub](https://github.com/sponsors/expressots)**
-   Follow the **[organization](https://github.com/expressots)** on GitHub and Star ⭐ the project
-   Subscribe to the Twitch channel: **[Richard Zampieri](https://www.twitch.tv/richardzampieri)**
-   Join our **[Discord](https://discord.com/invite/PyPJfGK)**
-   Contribute submitting **[issues and pull requests](https://github.com/expressots/expressots/issues)**
-   Share the project with your friends and colleagues

## License

Distributed under the MIT License. See [`LICENSE.txt`](https://github.com/expressots/expressots/blob/main/LICENSE) for more information.

<p align="right">(<a href="#readme-top">back to top</a>)</p>

<!-- MARKDOWN LINKS & IMAGES -->
<!-- https://www.markdownguide.org/basic-syntax/#reference-style-links -->

[codecov-url]: https://codecov.io/gh/expressots/boost-ts
[codecov-shield]: https://img.shields.io/codecov/c/gh/expressots/boost-ts/main?style=for-the-badge&logo=codecov&labelColor=FB9AD1
[npm-url]: https://www.npmjs.com/package/@expressots/boost-ts
[npm-shield]: https://img.shields.io/npm/v/@expressots/boost-ts?style=for-the-badge&logo=npm&color=9B3922
[build-shield]: https://img.shields.io/github/actions/workflow/status/expressots/boost-ts/build.yaml?branch=main&style=for-the-badge&logo=github
[contributors-shield]: https://img.shields.io/github/contributors/expressots/boost-ts?style=for-the-badge
[contributors-url]: https://github.com/expressots/boost-ts/graphs/contributors
[forks-shield]: https://img.shields.io/github/forks/expressots/boost-ts?style=for-the-badge
[forks-url]: https://github.com/expressots/boost-ts/forks
[stars-shield]: https://img.shields.io/github/stars/expressots/boost-ts?style=for-the-badge
[stars-url]: https://github.com/expressots/boost-ts/stargazers
[issues-shield]: https://img.shields.io/github/issues/expressots/boost-ts?style=for-the-badge
[issues-url]: https://github.com/expressots/boost-ts/issues
[license-shield]: https://img.shields.io/github/license/expressots/boost-ts?style=for-the-badge
[license-url]: https://github.com/expressots/boost-ts/blob/main/LICENSE
[linkedin-shield]: https://img.shields.io/badge/-LinkedIn-black.svg?style=for-the-badge&logo=linkedin&colorB=555
[linkedin-url]: https://www.linkedin.com/company/expresso-ts/
[product-screenshot]: images/screenshot.png
