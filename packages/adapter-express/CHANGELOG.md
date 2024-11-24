## [3.0.0-beta.2](https://github.com/expressots/adapter-express/compare/3.0.0-beta.1...3.0.0) (2024-11-24)

### Features

- add getHttpServer method and update listen method to return a promise ([82895c2](https://github.com/expressots/adapter-express/commit/82895c279c6103c7e96ee01810030d656142d509))
- add unit tests for various utility functions and application lifecycle methods ([d3d91b0](https://github.com/expressots/adapter-express/commit/d3d91b05205460eac1399c991dd25b06d942d93d))
- add unit tests IOC container addScoped, addSingleton, addTransient, get ([e3028fa](https://github.com/expressots/adapter-express/commit/e3028fa3bd7e0c57835dbd200f0621d3a9a27a1e))
- implement Express Micro API adapter with route management and IoC container ([1720378](https://github.com/expressots/adapter-express/commit/1720378011603b1d0b8806e92f6b469067be577a))

### Bug Fixes

- exclude dependency injection files from coverage collection ([e8fdd90](https://github.com/expressots/adapter-express/commit/e8fdd908258b83f35d1121c1000b45039f6fd960))
- update @expressots/core dependency version to use semantic versioning ([2130e4d](https://github.com/expressots/adapter-express/commit/2130e4d850c35ad35855c7def32fb86ddeffca64))

### Code Refactoring

- clean up whitespace and formatting in various test files ([5be0404](https://github.com/expressots/adapter-express/commit/5be0404cec12363d40a1181c7209527369422cf3))

## [3.0.0-beta.1](https://github.com/expressots/adapter-express/compare/1.8.2...3.0.0) (2024-11-18)

### Features

- add container interface and remove inversify and binding deps ([0b8c17b](https://github.com/expressots/adapter-express/commit/0b8c17b007373f82224dfd7a43b9a2a16790edbd))
- add env configuration load from expressots.config ([ec6e476](https://github.com/expressots/adapter-express/commit/ec6e476c10a3d51d1c69221fe7dd60d93985cfd4))
- add express dependency version 4.21.1 to package.json ([793b48c](https://github.com/expressots/adapter-express/commit/793b48c60ec34f92ab9d5518e622e3d904875dbd))
- add global config method and env variables ([d688a83](https://github.com/expressots/adapter-express/commit/d688a8352ebf7726ba19a158be1ac4e6b9282a41))
- add global configuration method and enhance listen interface ([7447934](https://github.com/expressots/adapter-express/commit/74479347074e9644483a8057d042f92e9de4dc87))
- add logging for NO_CONTROLLERS_FOUND error in express-utils ([1c76dc8](https://github.com/expressots/adapter-express/commit/1c76dc899f22805e4da57359c501279bbeef0b6e))
- add unit tests for BaseMiddleware and Http decorators, update .gitignore and package.json ([532b891](https://github.com/expressots/adapter-express/commit/532b891698e295568f8be858d2e9208acc58277e))
- enhance application-express interfaces and refactor container configuration ([e1f55fe](https://github.com/expressots/adapter-express/commit/e1f55fe24c99c030e8fa29069b0cb152d8370fac))
- enhance HttpStatusCodeMiddleware to accept globalPrefix for path handling ([a568598](https://github.com/expressots/adapter-express/commit/a5685980d98c45e9d36a62ba71538379dfbda6d2))
- integrate RenderEngine from @expressots/shared and remove deprecated types ([a2a22f9](https://github.com/expressots/adapter-express/commit/a2a22f916cd4343323b9f19b4743a77d4cf06f12))
- migrate from Vitest to Jest for testing framework and update configuration files ([e76eb30](https://github.com/expressots/adapter-express/commit/e76eb30167dcb14fa1fe5123ea5b99cfa0e2d324))

### Bug Fixes

- correct formatting in IWebServerPublic and AppExpress documentation ([04fd0f0](https://github.com/expressots/adapter-express/commit/04fd0f03e58b7b3d0c7f7593af33c56e3fcc1000))
- format NO_CONTROLLERS_FOUND message for consistency ([dcd24cb](https://github.com/expressots/adapter-express/commit/dcd24cb5c018924b69b5c2c949159882fb477918))
- set default port to 3000 if not provided in application-express ([0607f57](https://github.com/expressots/adapter-express/commit/0607f57ebe723efd9b14ab49ca3c16a47486e94e))
- update version and refine no controllers found message ([d4eb6a7](https://github.com/expressots/adapter-express/commit/d4eb6a75ae4d75bf63deda03bace766b17286e64))

### Code Refactoring

- adjust and rename public apis ([b69e212](https://github.com/expressots/adapter-express/commit/b69e212c76bc51b51ce5a8a95b99a1bb2dbba13d))
- change to IConsoleMessage the Console ([56311e6](https://github.com/expressots/adapter-express/commit/56311e684a3da4ea7c5742fbb90e2d75a7890b7e))
- clean up imports and formatting in application-express files ([c24233a](https://github.com/expressots/adapter-express/commit/c24233ab0af19bfa80e71d6c86c05cc33f099503))
- environment optional via enum, string and undefined ([b1ea563](https://github.com/expressots/adapter-express/commit/b1ea563146e2497e8b184f9211b8bb6724b321cd))
- partial env config load ([4fca6cc](https://github.com/expressots/adapter-express/commit/4fca6cc1db6e597e379266ec256a6dee84696216))
- remove provide decor for items not in container ([42f762c](https://github.com/expressots/adapter-express/commit/42f762cd51f028a0472982fea575f4e45562b174))
- update IWebServer interface and improve doc for public API methods ([e123d43](https://github.com/expressots/adapter-express/commit/e123d435b281c4a5bf7691c528a68ea1bc8ab80d))

### Tests

- add test for server environment ([0c76de1](https://github.com/expressots/adapter-express/commit/0c76de1bd5f985ede154faf592d0bf0dc6fc5e4f))

## [1.8.2](https://github.com/expressots/adapter-express/compare/1.8.1...1.8.2) (2024-08-31)

### Bug Fixes

- fileupload req and res retrieval ([1bf2465](https://github.com/expressots/adapter-express/commit/1bf246585f3280220f9da96b00f1780f6fe0169d)), closes [#113](https://github.com/expressots/adapter-express/issues/113)

### Code Refactoring

- file upload type validation & args res, req optional ([9ae3af4](https://github.com/expressots/adapter-express/commit/9ae3af4c58b2ee2c3c5d89dcc93101b092299b3a))

## [1.8.1](https://github.com/expressots/adapter-express/compare/1.8.0...1.8.1) (2024-08-21)

### Bug Fixes

- remove server env export & update core deps ([38e1afd](https://github.com/expressots/adapter-express/commit/38e1afddbfc5f47cb9e65c3ed560f8a551ff2172))

## [1.8.0](https://github.com/expressots/adapter-express/compare/1.7.0...1.8.0) (2024-08-13)

### Features

- add expressots middleware in decorators ([055ead9](https://github.com/expressots/adapter-express/commit/055ead94334dd5ea735ddf04a16a322d56d566cc))
- add FileUpload decorator ([a4f62b1](https://github.com/expressots/adapter-express/commit/a4f62b1cd377625c55218069599a7a262493e3f5))

### Bug Fixes

- adjust error msgs and package resolver ([34a0fcd](https://github.com/expressots/adapter-express/commit/34a0fcde6e637130e328733f48130408fa881a67))
- adjust isExpressoMiddleware function param types ([edc0888](https://github.com/expressots/adapter-express/commit/edc0888489df4c9f33a5b97af0820ce8f90904e9))
- return message ([32d656e](https://github.com/expressots/adapter-express/commit/32d656ec2b05a807599e428c9bd0389849c2165d))

### Code Refactoring

- bump expresso core deps & remove husky deprecated code ([a9b243f](https://github.com/expressots/adapter-express/commit/a9b243fd35b877c839da2871401574cf30db808e))
- httpMethod to Method decorator ([5e853a0](https://github.com/expressots/adapter-express/commit/5e853a04358430e9e6f658bf0d0b68b7e2708a24))
- remove unnecessary comments ([72c4a15](https://github.com/expressots/adapter-express/commit/72c4a157055fffdfbaad19a69ea124ca0eb7fa13))

## [1.7.0](https://github.com/expressots/adapter-express/compare/1.6.0...1.7.0) (2024-07-23)

### Features

- add @Render decorator ([522d6e2](https://github.com/expressots/adapter-express/commit/522d6e27163b1ec638a9d5328fb3bf5f81054c5c))
- add pug engine support ([a879f96](https://github.com/expressots/adapter-express/commit/a879f9642dccd74a49b9188a25fcd1bbf30eb8ba))
- bump husky from 9.0.11 to 9.1.1 ([7c1678a](https://github.com/expressots/adapter-express/commit/7c1678abf4a78e52483fff190524c5658dba1100))
- bump vite from 5.3.3 to 5.3.4 ([86f51a3](https://github.com/expressots/adapter-express/commit/86f51a3f5f920fcc7a760730e877ae830fa574e5))

### Bug Fixes

- add options to ejs and hbs support ([b52ce5c](https://github.com/expressots/adapter-express/commit/b52ce5c3860ea7d859534d96cee030dbc4ffc19c))

## [1.6.0](https://github.com/expressots/adapter-express/compare/1.5.0...1.6.0) (2024-07-17)

### Features

- add render support for EJS and HBS ([8618655](https://github.com/expressots/adapter-express/commit/861865564bcdb2d90d7a083bf19f76918e810744))
- adjust version of core package ([a699bd4](https://github.com/expressots/adapter-express/commit/a699bd4e24fd86474f2c678798abcdd311bce0f1))
- bump @types/node from 20.14.9 to 20.14.10 ([9a1291b](https://github.com/expressots/adapter-express/commit/9a1291b7c5174d68e079f2b46b0cd140cf4332c1))
- bump @typescript-eslint/eslint-plugin from 7.15.0 to 7.16.1 ([e7d3c9a](https://github.com/expressots/adapter-express/commit/e7d3c9aea3e260417af7a77694e0c0511e0307b7))
- bump @typescript-eslint/parser from 7.15.0 to 7.16.1 ([2a99945](https://github.com/expressots/adapter-express/commit/2a99945f749015301b7e53d9bbfa151aa9adb0f6))
- bump prettier from 3.3.2 to 3.3.3 ([d7de72a](https://github.com/expressots/adapter-express/commit/d7de72a87b8ca503ff37d6ce0974ceb53af51dfe))
- bump release-it from 17.4.1 to 17.6.0 ([c36aeb6](https://github.com/expressots/adapter-express/commit/c36aeb6a51e446bb3757421fe613fd3202dfaf16))
- bump typescript from 5.2.2 to 5.5.3 ([53f9f96](https://github.com/expressots/adapter-express/commit/53f9f96f65d2b4652126f7f42c2b9774f0db7328))
- bump vitest and @vitest/coverage-v8 ([b2dae7e](https://github.com/expressots/adapter-express/commit/b2dae7e4e247e288a5fe8fefe135e47925b2f122))
- bump vitest and @vitest/coverage-v8 ([b3221eb](https://github.com/expressots/adapter-express/commit/b3221eba32cc85e304fef1cb98389dcae0566c24))
- linter adjust ([e43d222](https://github.com/expressots/adapter-express/commit/e43d2221ec3f869d60dc2b967ab325e3aaecc97b))

### Bug Fixes

- bump node version 18.18 and removed deprecated install in husky ([778ed79](https://github.com/expressots/adapter-express/commit/778ed79c3595fd239656d8182623635a8fff16d0))

## [1.5.0](https://github.com/expressots/adapter-express/compare/1.4.0...1.5.0) (2024-06-11)

### Features

- bump @commitlint/config-conventional from 17.7.0 to 19.2.2 ([c4db260](https://github.com/expressots/adapter-express/commit/c4db260694b492e5744dc7c59ce4edae23053ec8))
- bump @release-it/conventional-changelog from 7.0.1 to 7.0.2 ([d063fd9](https://github.com/expressots/adapter-express/commit/d063fd9ff2b405eb69197b70cad72334d814b6bf))
- bump eslint-config-prettier from 9.0.0 to 9.1.0 ([20ca753](https://github.com/expressots/adapter-express/commit/20ca753e4297889506af98e6caa5b1f374aded59))
- bump husky from 8.0.3 to 9.0.11 ([8cb065e](https://github.com/expressots/adapter-express/commit/8cb065e49e209b2a6ab56d07a712df30596350ca))
- bump prettier from 3.0.3 to 3.3.1 ([872c7ba](https://github.com/expressots/adapter-express/commit/872c7ba7072c1cfb36a7efe74be0b41f6aea541b))
- bump prettier from 3.3.1 to 3.3.2 ([5edd349](https://github.com/expressots/adapter-express/commit/5edd3490f1a6fa48a65694a9c146c2ec69a264d3))
- bump release-it from 16.1.5 to 16.3.0 ([5febf25](https://github.com/expressots/adapter-express/commit/5febf2517dec9857d59ec189829262dafcc63fbd))

### Bug Fixes

- decorator method case confict fix ([cdf0fbd](https://github.com/expressots/adapter-express/commit/cdf0fbd6c864a0e538372dc102664538112f0e30))
- init commit ([55359bf](https://github.com/expressots/adapter-express/commit/55359bf31acfdf0186f6916cd0dc1897d1f24cd2))
- patch issue where not using http decorator shows incorrect code ([975e451](https://github.com/expressots/adapter-express/commit/975e45112181088bcb9d8f1487e8272deb49d3df))
- remove comments and logs for prod build ([cd0151b](https://github.com/expressots/adapter-express/commit/cd0151be92f1cb73b6040a72db6d4f1268ae6cfc))
- remove unused method param in find param pattern ([fd40872](https://github.com/expressots/adapter-express/commit/fd4087276672a6b3c34563736892e4065a497bfa))

### Code Refactoring

- without and with decor in the same route conflict ([469f65e](https://github.com/expressots/adapter-express/commit/469f65e9248aefe5db084608684ca211204c2f5b))

## [1.4.0](https://github.com/expressots/adapter-express/compare/1.3.0...1.4.0) (2024-06-07)

### Features

- Add http code decorator ([f0f6e0a](https://github.com/expressots/adapter-express/commit/f0f6e0aa034636d7df67d5f1cef83adb6a3af8bc))
- add vitest and setup codecov in the ci ([14fd527](https://github.com/expressots/adapter-express/commit/14fd527a097d981778f2b3ba2a68effb68865d8f))
- adjust doc, update metadata const for http decorator ([773f297](https://github.com/expressots/adapter-express/commit/773f297fee340b5d8de6a134454425328ddbbc03))
- dev-http decorator changes ([8088f5c](https://github.com/expressots/adapter-express/commit/8088f5c2ef391abbe33d1e8750bef9a6fe34f699))
- fix issues where decorator does not function properly when used multiple times in same file ([919815f](https://github.com/expressots/adapter-express/commit/919815f4f1232f9a319ed887a99f8c214b40341d))

### Bug Fixes

- build shield workflow status ([3e5d6c8](https://github.com/expressots/adapter-express/commit/3e5d6c814cb5ed71cfa7a4f5e65f77ad359671f6))
- code coverage upload path ([aef20eb](https://github.com/expressots/adapter-express/commit/aef20eb2767506e7d9c7773233727c96cb5ca9b7))
- remove codesee ci config ([043c423](https://github.com/expressots/adapter-express/commit/043c423c52d00c814c6357c1e7f6ed7caed3b2ac))
- remove the decorator incorrect call in the library due mismatch on tsconfig ([58dbb52](https://github.com/expressots/adapter-express/commit/58dbb5258a7c2155dd34b1841dbfbe15884f4e21))

### Code Refactoring

- readme badges npm, coverage and build added ([d643acd](https://github.com/expressots/adapter-express/commit/d643acde38df4866155a0164f08c2d7f0261c705))

## [1.3.0](https://github.com/expressots/adapter-express/compare/1.2.2...1.3.0) (2024-04-26)

### Features

- returns httpServer for e2e testing with supertest ([97999fb](https://github.com/expressots/adapter-express/commit/97999fbc7ac977e47caf023d7541e588ef50d548))

## [1.2.2](https://github.com/expressots/adapter-express/compare/1.2.1...1.2.2) (2024-04-25)

### Bug Fixes

- validate parameter types in param decorator by default ([b7a8657](https://github.com/expressots/adapter-express/commit/b7a8657598ce51a6fa44c3a388d38106b47ad70d))

## [1.2.1](https://github.com/expressots/adapter-express/compare/1.2.0...1.2.1) (2024-04-04)

### Code Refactoring

- adapter expressto to be used in AppFactory ([239501e](https://github.com/expressots/adapter-express/commit/239501e41bfd98ecc0893a50c34de58dd8914d9e))
- rename items for standardization and improve doc ([2e691d5](https://github.com/expressots/adapter-express/commit/2e691d50731e8d4d689fe4b4420daab8ba2f5803))

## [1.2.0](https://github.com/expressots/adapter-express/compare/1.1.1...1.2.0) (2024-3-5)

### Features

- add expressots middleware support ([809f148](https://github.com/expressots/adapter-express/commit/809f148a2b9a6bb0aa41f231595b3a4c394574ee))
- bump @commitlint/cli from 17.8.1 to 18.0.0 ([15fbb1a](https://github.com/expressots/adapter-express/commit/15fbb1a84c758df25b60f2a893fd44829db3c0dc))
- fix middleware binding to constructor ([3a6f7dc](https://github.com/expressots/adapter-express/commit/3a6f7dca40889133b09630582c775156392c4fd7))
- fix path call on expresso middleware ([934ae17](https://github.com/expressots/adapter-express/commit/934ae17110489315536e28b71cde24f5f18d88dc))

## [1.1.1](https://github.com/expressots/adapter-express/compare/1.1.0...1.1.1) (2023-10-10)

### Bug Fixes

- add global prefix on opinionated ([d9d5a06](https://github.com/expressots/adapter-express/commit/d9d5a0669241ed14541a1452aa0deaa12c1109b4))
- add global route prefix for both templates ([046fd2c](https://github.com/expressots/adapter-express/commit/046fd2c2e2c5beacf9602f929b223713d48e8b9c))
- adjust build pipeline ([4f164a2](https://github.com/expressots/adapter-express/commit/4f164a2f6ee5c23512a8e6643b90a74891ec52c4))
- adjust build script and remove esm build option ([b35af7b](https://github.com/expressots/adapter-express/commit/b35af7b9ea91935572920314eddc8f5258bca4bc))
- path in codeql analysis report ([035aa16](https://github.com/expressots/adapter-express/commit/035aa16a9d62de8d7e2b39bae052d8d5499799da))

## 1.1.0 (2023-09-21)

### Features

- add express as an adapter ([2870790](https://github.com/expressots/adapter-express/commit/28707900882422d0f882e5e18c9bf01457e5640d))
- add expressjs adapter ([263d12d](https://github.com/expressots/adapter-express/commit/263d12dce314cc4125a0f5b14eaa0b5e171f165f))
- add peer dependency @expressots/core ([7e8ec24](https://github.com/expressots/adapter-express/commit/7e8ec240fe5caf72a0c371ba317c0d0f52898571))

### Bug Fixes

- add dev 0 package version ([748b62a](https://github.com/expressots/adapter-express/commit/748b62ad101ed6efe4454f9a9f0d684f1118dec6))
- add dev version ([31baee3](https://github.com/expressots/adapter-express/commit/31baee3e7dd578e14fbc6e1e11eb88ae939e1d28))
- consume new middlewareConfig base ([bed7b4a](https://github.com/expressots/adapter-express/commit/bed7b4ae682a8c8d55c705e5d2f9b40b136e2af1))
- expose controller interface ([468818f](https://github.com/expressots/adapter-express/commit/468818fec78e06392cb6024cb4b257edebfd8d38))
- signature to [@core-v2](https://github.com/core-v2).2 ([4fb5c58](https://github.com/expressots/adapter-express/commit/4fb5c58aa4f011c3aa97803ebc8a80ae72d5b56d))
- update [@core](https://github.com/core) dependency to altest ([0138609](https://github.com/expressots/adapter-express/commit/01386093f6116e4731270fd17a1250b564387c56))
- update peer dependecy for [@core](https://github.com/core) ([16a01f3](https://github.com/expressots/adapter-express/commit/16a01f353f3285a68a2038ceb40b6498c64c5a34))

## 0.0.1 (2023-09-05)

### Bug Fixes

- testing commitlint ([0e78653](https://github.com/expressots/<<repo_name>>/commit/0e786539402f69fdca3fe5b684d850e523db7698))
