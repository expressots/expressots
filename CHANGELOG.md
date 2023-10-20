

## [2.7.0](https://github.com/expressots/expressots/compare/2.6.0...2.7.0) (2023-10-17)


### Features

* add db in memory as provider ([b656f22](https://github.com/expressots/expressots/commit/b656f2297e0e985dd5184c611f795edddf6c5b2d))
* modify IMemoryDB interface name ([fd1d440](https://github.com/expressots/expressots/commit/fd1d440eb947f377955bfc2a969d3e7ca4ffaa3e))


### Bug Fixes

* remove db in memory from template opinionated ([0516c8c](https://github.com/expressots/expressots/commit/0516c8c4e9c0e1a4b8aae3fab5842136a0565a39))


### Tests

* improve collocation and fix console tests ([52bdf98](https://github.com/expressots/expressots/commit/52bdf98cfcbbffc58841b1b67c6ce2a1f6fe308b))

## [2.6.0](https://github.com/expressots/expressots/compare/2.5.0...2.6.0) (2023-10-09)


### Features

* Added express-session middleware for expressots ([9d0c79f](https://github.com/expressots/expressots/commit/9d0c79f7c4b18cfcac17443c7f76c4384a563471))
* bump vite from 4.4.10 to 4.4.11 ([45c8a80](https://github.com/expressots/expressots/commit/45c8a804e85875743cc18d95ec5441e19b7df7d3))


### Bug Fixes

* Auto setup husky with project setup and installation ([dcdc279](https://github.com/expressots/expressots/commit/dcdc279f9dffe82e739396df763f494c97a3e914))
* remove prepare husky install from lib ([ba9b536](https://github.com/expressots/expressots/commit/ba9b5363904a7d8981ec49705d5fbf22e20c8dbd))
* typo ([079aad6](https://github.com/expressots/expressots/commit/079aad6c125fcd100cde5cf98ce84125e7381879))

## [2.5.0](https://github.com/expressots/expressots/compare/2.4.0...2.5.0) (2023-10-04)


### Features

* bump vite from 4.4.9 to 4.4.10 ([5be4adc](https://github.com/expressots/expressots/commit/5be4adc18d84c3affa57d248dd07801bda4dd5b9))
* bump vitest from 0.34.5 to 0.34.6 ([11ca77f](https://github.com/expressots/expressots/commit/11ca77f29d19d1de05b2ae2a56b9e306311621bf))
* **core:** add helmet middleware ([7648afb](https://github.com/expressots/expressots/commit/7648afb68054c1e69990f7d33efe35ec4d99b464)), closes [#107](https://github.com/expressots/expressots/issues/107)


### Bug Fixes

* adjust interface, remove duplicated helmet registry ([376c065](https://github.com/expressots/expressots/commit/376c0654d655ee8d29c0649d83ec6fb7cf860791))
* remove duplicate optionslhelmet interface ([93bfdea](https://github.com/expressots/expressots/commit/93bfdea0057614b0a2e449817fb095ed23112011))

## [2.4.0](https://github.com/expressots/expressots/compare/2.3.0...2.4.0) (2023-10-01)


### Features

* add interface for `express-rate-limit` ([86cf5d2](https://github.com/expressots/expressots/commit/86cf5d2d2bdbdd4acdd6f4a0597634790d99f972))
* implement `express-rate-limit` in service ([e31a5f4](https://github.com/expressots/expressots/commit/e31a5f47b67ac01795b6ac64e639cd53078f8048))


### Bug Fixes

* add App container all tests ([d6c8212](https://github.com/expressots/expressots/commit/d6c8212ec80fe239b38e4ff592ed0be3e507cd99))
* add cjs as default build ([d16cfa5](https://github.com/expressots/expressots/commit/d16cfa50238c2e299fffaf079fb62847de94e7d8))
* add code coverage configuration ([3676e32](https://github.com/expressots/expressots/commit/3676e328833bd92ea7ebe28b567195bbd5c25bb2))
* adjust reporter to text, html, json ([04acb04](https://github.com/expressots/expressots/commit/04acb04c2e9229f0531ffb990f22665d94506f2c))
* remove adapter peer dependecy ([bad171b](https://github.com/expressots/expressots/commit/bad171be98f3b2ec58c3793836ba2000c3727dbc))
* resolves all current issues ([877c121](https://github.com/expressots/expressots/commit/877c1216405e35b3b90f61caf13d73b20202eac5))


### Documentation

* add jsdoc to interfaces ([228d190](https://github.com/expressots/expressots/commit/228d190f7ca58c71e5bcd1f03ecf70b2e7fdbe03))


### Code Refactoring

* add types to default params ([b366e14](https://github.com/expressots/expressots/commit/b366e14d2b7d9322b4ea92ae3afdfbb834e42e16))
* eliminate duplicate return statements ([b57fa85](https://github.com/expressots/expressots/commit/b57fa8517c5656fed71b73cc3c2b65834c8d8833))
* revert changes due to future features ([89fce01](https://github.com/expressots/expressots/commit/89fce01f08ebd1539471e51808040e4383c3e6f4))

## [2.3.0](https://github.com/expressots/expressots/compare/2.2.1...2.3.0) (2023-09-25)


### Features

* add morgan middleware ([ffe5f36](https://github.com/expressots/expressots/commit/ffe5f36b447f7fafd3a44c90a304b3b9c5ec4481))
* bump vitest from 0.34.4 to 0.34.5 ([e1a1da5](https://github.com/expressots/expressots/commit/e1a1da51ab35bf6bb24ba9073b270a490ab331d8))


### Bug Fixes

* add IMorgan interface to serve it types ([adb29e5](https://github.com/expressots/expressots/commit/adb29e505af79cf998f1288085695dfee8e5680d))

## [2.2.0](https://github.com/expressots/expressots/compare/2.1.0...2.2.0) (2023-09-21)


### Features

* add middleware based routing ([3d7720e](https://github.com/expressots/expressots/commit/3d7720e21807117333d60e7f2b7bb01789b96060))
* add serve-favicon middleware ([024bdc4](https://github.com/expressots/expressots/commit/024bdc4d8d4f9890175975d052ca09c5b4e245cf))
* add serve-favicon middleware ([0733697](https://github.com/expressots/expressots/commit/0733697ed66a7133e60ec6fa09bdaeb0bf1985d7))


### Bug Fixes

* add chore message to pre-commit hook ([45ae428](https://github.com/expressots/expressots/commit/45ae428652bb6e4f49cb2a6334686be0dee3669d))
* add middleware validation based on path ([7035153](https://github.com/expressots/expressots/commit/7035153dededd3ca7c5159544f4ab79baee2c4d7))
* re-write cp, mv and rm improving performance ([68d68ad](https://github.com/expressots/expressots/commit/68d68ad11385ca783fa5c51e3092937a6f898ac6))
* update contribute_howto doc ([4bf6e12](https://github.com/expressots/expressots/commit/4bf6e121091e894a7675ff78959ab4647ec04f6d))
* update contribute_howto doc ([fbbe47d](https://github.com/expressots/expressots/commit/fbbe47d6df76211fadd736fab864aa41e0313ec9))
* update templates for v2 scaffold ([74811f3](https://github.com/expressots/expressots/commit/74811f3ac54610be7367de75f37363dc0c107dbc))


### Build System

* **scripts:** add cross platform build scripts ([e6cecbc](https://github.com/expressots/expressots/commit/e6cecbc6b7a309f00aa6cd60f6d8207dc8d4c5cb))
* **scripts:** add cross platform build scripts ([8b5c133](https://github.com/expressots/expressots/commit/8b5c133e4e28d67b8a7edca5b04bfe04a6d12540))

## [2.1.0](https://github.com/expressots/expressots/compare/2.0.0...2.1.0) (2023-09-16)


### Features

* add cookie-parser middleware ([2fe9377](https://github.com/expressots/expressots/commit/2fe93776423355503211a0d96f2b1952e3bc6320))
* add cookie-parser middleware ([a53a0c2](https://github.com/expressots/expressots/commit/a53a0c2e23dafc188286cd0ff5a6145cf3416ad0))
* add cookie-session middleware ([323c2d3](https://github.com/expressots/expressots/commit/323c2d32c5e4a9c78f19fe47807f323139fb306a))
* add cookie-session middleware ([60ac1fa](https://github.com/expressots/expressots/commit/60ac1fa36b2a8388983be0ab8f2d8a1696089d78))


### Bug Fixes

* create folder for interface and print pck name instead of curated name ([2a47508](https://github.com/expressots/expressots/commit/2a47508f5170950ddd8b471fffc8d43a8fb57e32))

## [2.0.0](https://github.com/expressots/expressots/compare/1.9.1...2.0.0) (2023-09-14)

### Features

- add middleware resolver ([23b8d9f](https://github.com/expressots/expressots/commit/23b8d9ff8f0c8b4bb893f4fd0d7f39afcb7dd1cd))
- add app factory
- add services layer
- add middleware interfaces for cors, compression, bodyparser and generic middleware
- add configurable error handler
- separate expressjs from core library in its own library called adapter-express
- created provider mechanism to share resources between multiple adapters
- eliminate chalk, inversify utils dependencies
- create a logger system using stdout

### Code Refactoring

- refactor error handling
- remove winston lib for loggin ([5868bc9](https://github.com/expressots/expressots/commit/5868bc949f2242f0a9bfe5483642bb3878cc0156))
- removing unnecessary dependencies ([fdd43e0](https://github.com/expressots/expressots/commit/fdd43e0f280024b8e4b53f392ea56842a091898e))

## [1.9.1](https://github.com/expressots/expressots/compare/1.9.0...1.9.1) (2023-09-14)

### Bug Fixes

- add peer dependency @expressots/adapter-express ([874db40](https://github.com/expressots/expressots/commit/874db402af7bac8d5ac638fc206f3daf9f707fc3))
- change esm config to modeule interop ([32f04b5](https://github.com/expressots/expressots/commit/32f04b5bc7da6c515df70b0156f2f5cadd5526ac))
- change esm config to modeule interop ([978b168](https://github.com/expressots/expressots/commit/978b1685aa18c0573313ee96049159a1c95c4d87))
- opinionated template app provider services ([bcb55ca](https://github.com/expressots/expressots/commit/bcb55caf1e5a0ff053b5aaf89a79ef4537b38161))
- using adapter-express dependency ([84b0348](https://github.com/expressots/expressots/commit/84b03486193632b84e46e670bd44c6f8a01ebaa4))

### Code Refactoring

- create express adapter platform ([784beaa](https://github.com/expressots/expressots/commit/784beaaea9247e304abada8ebd33c673199e35f9))
- expose app base class for adapter ([36d8dec](https://github.com/expressots/expressots/commit/36d8dec0435a2456d1b9e1d5dca5bfb8956cfdea))

## [1.9.0](https://github.com/expressots/expressots/compare/1.8.1...1.9.0) (2023-09-12)

### Features

- add pck resolver & remove chalk dependency ([6bbd415](https://github.com/expressots/expressots/commit/6bbd415937159e419116b6ade8f9852c3251fbf4))
- bump vitest from 0.34.3 to 0.34.4 ([#92](https://github.com/expressots/expressots/issues/92)) ([89dc682](https://github.com/expressots/expressots/commit/89dc682c7047897f01fd7770591b6ffea689d137))

### Bug Fixes

- disable console.spec to be refactored ([22a54bd](https://github.com/expressots/expressots/commit/22a54bdb7f0c2032d3b0e0f935ce48d73e665e84))
- dto validator json structure per property ([a8fbe40](https://github.com/expressots/expressots/commit/a8fbe409647140e867f930a882fd395df45d6de7))
- export console for testing ([d3f2c07](https://github.com/expressots/expressots/commit/d3f2c07ca2df0176fabed04172ce4ff684c91c9c))
- opinionated template logger.error function ([073f4e1](https://github.com/expressots/expressots/commit/073f4e154732fa3fed9492ec772c36894bc3cf48))
- replace dto interface for class opinionated template ([3e99d7c](https://github.com/expressots/expressots/commit/3e99d7c5492ff64701e754ec845a0410da442296))
- use new report utility in usecases ([#91](https://github.com/expressots/expressots/issues/91)) ([d1477b2](https://github.com/expressots/expressots/commit/d1477b24f932e354fb55373e8e73fe9155289486))

### Code Refactoring

- update type from any to number ([#90](https://github.com/expressots/expressots/issues/90)) ([5e34a44](https://github.com/expressots/expressots/commit/5e34a44d8bd353b8d3834f198f36bf73aa521845))

## [1.8.1](https://github.com/expressots/expressots/compare/1.8.0...1.8.1) (2023-09-10)

### Bug Fixes

- add generic in memory db and virtual table analysis ([#86](https://github.com/expressots/expressots/issues/86)) ([29541f9](https://github.com/expressots/expressots/commit/29541f997e47c8ac5f8cafbb0195c34c904454f4))

### Continuous Integrations

- config test workflow and setup vitest ([#88](https://github.com/expressots/expressots/issues/88)) ([67316ce](https://github.com/expressots/expressots/commit/67316cece977f04f9750a5a5af6cd88dfc695e0d))

## [1.8.0](https://github.com/expressots/expressots/compare/1.7.0...1.8.0) (2023-09-05)

### Features

- add benchmark folder ([#83](https://github.com/expressots/expressots/issues/83)) ([30cb1f9](https://github.com/expressots/expressots/commit/30cb1f922f980de23b0e8e896b552a0708075201))
- bump prettier from 3.0.1 to 3.0.2 ([#74](https://github.com/expressots/expressots/issues/74)) ([a66f80d](https://github.com/expressots/expressots/commit/a66f80d36967cc6112a30f422ec34a8dcb3efd66))
- bump prettier from 3.0.2 to 3.0.3 ([#80](https://github.com/expressots/expressots/issues/80)) ([59af991](https://github.com/expressots/expressots/commit/59af99177edc371c5608761c6b3f438806aba898))

### Bug Fixes

- increase the event range for graceful shutdown ([#76](https://github.com/expressots/expressots/issues/76)) ([8e88c7e](https://github.com/expressots/expressots/commit/8e88c7e2f1f0b2091c013885a823bbda533de62b))
- remove verb should from unit tests labels ([#78](https://github.com/expressots/expressots/issues/78)) ([f37d028](https://github.com/expressots/expressots/commit/f37d02878cbf2587028d7c61ecc35c4981721eab))
- update readme ([c1f0bcd](https://github.com/expressots/expressots/commit/c1f0bcd341284b4259454b579ccaf35091b1e2e1))

## [1.7.0](https://github.com/expressots/expressots/compare/1.6.0...1.7.0) (2023-08-14)

### Features

- bump @release-it/conventional-changelog from 5.1.1 to 6.0.0 ([#61](https://github.com/expressots/expressots/issues/61)) ([634304b](https://github.com/expressots/expressots/commit/634304b8228a0c6f4a4e8298961f46e4bd5c9b7c))
- bump @types/node from 18.17.4 to 20.4.9 ([#72](https://github.com/expressots/expressots/issues/72)) ([31a887d](https://github.com/expressots/expressots/commit/31a887d3a33923dba4c8d952ec60046e21f08361))

### Bug Fixes

- add `options` parameter to `AppContainer` ([#73](https://github.com/expressots/expressots/issues/73)) ([804d5cd](https://github.com/expressots/expressots/commit/804d5cd568830584322d877b91dffaed8c952e56))

## [1.6.0](https://github.com/expressots/expressots/compare/1.5.1...1.6.0) (2023-08-07)

### Features

- add community ideas form ([#43](https://github.com/expressots/expressots/issues/43)) ([e23c936](https://github.com/expressots/expressots/commit/e23c9360cec22f21a8f44e04b290cf6aa23aef17))
- add dependabot for fetch new version of dependencies ([#60](https://github.com/expressots/expressots/issues/60)) ([9ea1033](https://github.com/expressots/expressots/commit/9ea1033809eb19f50ae779824e5e428710c4480d))
- add prisma provider configuration types in ExpressoConfig ([#71](https://github.com/expressots/expressots/issues/71)) ([4a189a2](https://github.com/expressots/expressots/commit/4a189a2d85aed320d97fff4aebc48dcb0e125adf))
- bump prettier from 3.0.0 to 3.0.1 ([#68](https://github.com/expressots/expressots/issues/68)) ([b555e19](https://github.com/expressots/expressots/commit/b555e19698fd102c681b50a96e99ad37b399bae7))
- **prettier:** add a prettier config and run it in the core package ([#58](https://github.com/expressots/expressots/issues/58)) ([2ac367b](https://github.com/expressots/expressots/commit/2ac367b3c5911216a1ffb9b542ae4bb418227eba))

### Bug Fixes

- add workflow for auto project and label ([#44](https://github.com/expressots/expressots/issues/44)) ([1306d18](https://github.com/expressots/expressots/commit/1306d181bc904384a3edea0be219bba891b865cf))

## [1.5.1](https://github.com/expressots/expressots/compare/1.5.0...1.5.1) (2023-07-16)

### Bug Fixes

- add 404 on opinionated template user usecases ([#41](https://github.com/expressots/expressots/issues/41)) ([e2920cc](https://github.com/expressots/expressots/commit/e2920cce79eaad3fc5f031f45375312cba790103))

## [1.5.0](https://github.com/expressots/expressots/compare/1.5.0-dev...1.5.0) (2023-07-12)

### Features

- add render engine for handlebars ([1257fe0](https://github.com/expressots/expressots/commit/1257fe08ec0bf9096af1927caddf6fa2a8d481e8))

## [1.5.0](https://github.com/expressots/expressots/compare/v1.4.2...v1.5.0) (2023-07-11)

### Features

- add render engine mechanic and handlebars sup ([#37](https://github.com/expressots/expressots/issues/37)) ([c9f1c61](https://github.com/expressots/expressots/commit/c9f1c616c3480575c013e1e3e6b397e9b6870fb2))

### Bug Fixes

- remove npm auto publish from ci ([#35](https://github.com/expressots/expressots/issues/35)) ([c7145aa](https://github.com/expressots/expressots/commit/c7145aa5b7e99ee774141824437c30df9e3f4882))

## [1.4.2](https://github.com/expressots/expressots/compare/v1.4.1...v1.4.2) (2023-06-19)

### Bug Fixes

- error handling ([#34](https://github.com/expressots/expressots/issues/34)) ([0c8bdc8](https://github.com/expressots/expressots/commit/0c8bdc8b933f64b76299396429162c0acae24feb))
- remove exclude pattern ([#33](https://github.com/expressots/expressots/issues/33)) ([9f5461b](https://github.com/expressots/expressots/commit/9f5461be50eaf4c0aa60952eef7e120228740287))
- update cicd ([#32](https://github.com/expressots/expressots/issues/32)) ([c6e4820](https://github.com/expressots/expressots/commit/c6e4820bd20b8c1fc43cbc80ddb609031d893f36))
- update usecases to the new error handling ([1471e25](https://github.com/expressots/expressots/commit/1471e252f9e05f4a1f034a95d248c27cdbb306cd))

## [1.4.1](https://github.com/expressots/expressots/compare/v1.4.0...v1.4.1) (2023-06-14)

### Bug Fixes

- add user crud, remove ping, app.container ([befb447](https://github.com/expressots/expressots/commit/befb44720185d95fab2d275f79d5d5152cba2836))
- correct bootstrap function name ([1b99dcc](https://github.com/expressots/expressots/commit/1b99dcc0a3910fcc490a19db169f3799e95ca175))
- report known error in middleware ([#31](https://github.com/expressots/expressots/issues/31)) ([3790e24](https://github.com/expressots/expressots/commit/3790e24e9c30f3823a5b88eb4525cc892d5866df))
- update .env.example ([90c0375](https://github.com/expressots/expressots/commit/90c0375763d5d942332a6217fa23c17d4f2d7260))
- update changelog ([4e117b9](https://github.com/expressots/expressots/commit/4e117b9e4463374705fee83707444e0a112b656b))
- update core and template readme ([b2cc461](https://github.com/expressots/expressots/commit/b2cc461e730a24e7cadd323266fa1c862af7cf65))
- update non-op template app.container ([11a3938](https://github.com/expressots/expressots/commit/11a3938a8e1fa24e95da33cad0761967c9d6cd8e))
- update response type on controllers ([8ca9f5e](https://github.com/expressots/expressots/commit/8ca9f5eac99a3a921c7b6c39fb8129cee4670889))
- update singleton decorator in dbInmemory ([61bd590](https://github.com/expressots/expressots/commit/61bd590d06b96d297e6da8f92638df1ee8edce6b))

## [1.4.0](https://github.com/expressots/expressots/compare/v1.3.0...v1.4.0) (2023-05-14)

- add DI (dependency injection) singleton, transient, scope to container, providers, entities, etc

### Bug Fixes

- update sponsor link on package
- add example with controller only ([11b4ce3](https://github.com/expressots/expressots/commit/11b4ce3124482122a4f47fb27b7a1b1e02731621))
- opinionated template ientity id ([dd50ca0](https://github.com/expressots/expressots/commit/dd50ca0926c98890cbe1342f804ca34152c4a9f9))

## [1.3.0](https://github.com/expressots/expressots/compare/v1.2.1...v1.3.0) (2023-04-21)

### Features

- add user repository as singleton provider in opinionated template ([#24](https://github.com/expressots/expressots/issues/24)) ([3b5bded](https://github.com/expressots/expressots/commit/3b5bded07769d51f69b481e4b5e9b45c27d13a69))

### Bug Fixes

- add gitignore on opinionated template ([315d355](https://github.com/expressots/expressots/commit/315d355ed87eb6be85daddc250289d5e0d41cd21))
- findall use case query db in memory ([ff8feea](https://github.com/expressots/expressots/commit/ff8feeaf36d0b74eebd9ab4e22f1910cff0a4df8))
- the number of constructor arguments ([ccf2a48](https://github.com/expressots/expressots/commit/ccf2a4878e795e0182608546eae8cd83e3bea775))
- update core pkg templates to always download latest ([ca443eb](https://github.com/expressots/expressots/commit/ca443eb6be103725c73442f49e2fec14d797bba1))

## [1.2.1](https://github.com/expressots/expressots/compare/v1.2.0...v1.2.1) (2023-04-18)

### Features

- add bug report template ([8a160c4](https://github.com/expressots/expressots/commit/8a160c4b0b53be39a0fa42315936291be6694c8c))
- add feature request template ([9d264c6](https://github.com/expressots/expressots/commit/9d264c68e44fee754c906846aaa7a7c89cb6b571))

### Bug Fixes

- add expresso config ([086ba59](https://github.com/expressots/expressots/commit/086ba59aba1d430877c3807eb77df9460413dbce))
- add PR template ([1ce4b65](https://github.com/expressots/expressots/commit/1ce4b651a16d602ed459049eeac4200bb80e7651))
- config-path for build ([72d8086](https://github.com/expressots/expressots/commit/72d8086cc1067add1a3d69c8c13bc5b5d6b7e024))
- expose express.json() config ([717f677](https://github.com/expressots/expressots/commit/717f6779e033d0e616f7fd464b81edb6bf95c1a9))
- template import errors from dtos ([#25](https://github.com/expressots/expressots/issues/25)) ([471e311](https://github.com/expressots/expressots/commit/471e3114a4afa9a9dc4af16b872e75f6ef436ae3))
- update doc contributor ([75cc0cc](https://github.com/expressots/expressots/commit/75cc0cc6f7a0b0527b566c5a4e842c9d13c68ee9))
- update expressots version ([e170a1f](https://github.com/expressots/expressots/commit/e170a1fd1aab61fd2403707a54c8b027139eb26c))
- update jest config ([6b33fd6](https://github.com/expressots/expressots/commit/6b33fd6117d32a29d2516831b3a8e7ecd16dfb65))
- update non-opinionated config ([1b10e0e](https://github.com/expressots/expressots/commit/1b10e0e3ba9f679b2cc59d4c3ec75a8c2e238d43))
- update opinionated template ([b7bde50](https://github.com/expressots/expressots/commit/b7bde50ec10b9ad9c2d855d1189ad3ccf4e68108))
- update opinionated template ([cae55a0](https://github.com/expressots/expressots/commit/cae55a04d1282c08668ee5ef12b9976400e2acfd))
- update templates ([e58af09](https://github.com/expressots/expressots/commit/e58af0995c8f71ad104d1cc4cab79e74ba257bb1))
- update test coverage path ([0804c5c](https://github.com/expressots/expressots/commit/0804c5c4b6fd4437a69330a40621408273ffdfac))

## [1.2.0](https://github.com/expressots/expressots/compare/v1.1.0...v1.2.0) (2023-04-08)

### Features

- add doc & config types for cli ([a72db25](https://github.com/expressots/expressots/commit/a72db25088a8c2d0a18cd8fc71dde40e01cd4c22))

### Bug Fixes

- template folder path issue ([babdce9](https://github.com/expressots/expressots/commit/babdce9367f85ddd2075c4bed854ab83ee339add))

## [1.1.1](https://github.com/expressots/expressots/compare/v1.1.0...v1.1.1) (2023-04-04)

### Bug Fixes

- template folder path issue ([babdce9](https://github.com/expressots/expressots/commit/babdce9367f85ddd2075c4bed854ab83ee339add))

## [1.1.0](https://github.com/expressots/expressots/compare/v1.1.0-42-gc6f184868daa1b6862337621c69b5370b70a2772...v1.1.0) (2023-03-31)

## [1.2.0](https://github.com/expressots/expressots/compare/v1.1.0-41-gf2a0fd59ba849c6ee880121d773da15fe2580cb1...v1.2.0) (2023-03-31)

## [1.1.0](https://github.com/expressots/expressots/compare/v1.1.0-39-g71dbe2f089dcef87a2d71c00043eeb7ce4427771...v1.1.0) (2023-03-31)

## [1.1.0](https://github.com/expressots/expressots/compare/v1.1.0-37-g3e82d383af42099e2d3b0b347916e21dbbdd93c9...v1.1.0) (2023-03-31)

## [1.2.0](https://github.com/expressots/expressots/compare/v1.1.0-35-g27548a8d24a0891d1d04fca1ba131ad585fba5ef...v1.2.0) (2023-03-31)

- feat: add cjs/esm (92f858f)

## [1.1.0](https://github.com/expressots/expressots/compare/v1.1.0-32-gd0aa36eefab521c3be83d72c873e3d34d4ea88eb...v1.1.0) (2023-03-31)

## [1.2.0](https://github.com/expressots/expressots/compare/v1.1.0-27-g56b160429e341c190355e4003901cb8b0ddbe792...v1.2.0) (2023-03-31)

## [1.1.0](https://github.com/expressots/expressots/compare/v0.0.2...v1.1.0) (2023-02-19)

### Features

- add eslint prettier config ([906cdcc](https://github.com/expressots/expressots/commit/906cdcc0ebf00bee55c8cab66e95dd74c9296cb8))
- add opinionated template ([d1eb222](https://github.com/expressots/expressots/commit/d1eb222016c809a1a4576cce5b51660d55ad7c19))
- add readme ([557e1ff](https://github.com/expressots/expressots/commit/557e1ffcd41d1e482372183a0ea72820531740d7))
- update 01_base template ([d289c57](https://github.com/expressots/expressots/commit/d289c5752bb78ad6bce7f35fcdb7019e7cc38b6a))

### Bug Fixes

- add ping controller ([ca7b005](https://github.com/expressots/expressots/commit/ca7b005be099eadc35b5e6b96aaf82c0e3840c81))
- fix index.js main on package ([26596b7](https://github.com/expressots/expressots/commit/26596b7982143e63186461bde1324a81a8901446))
- fix jest compilation error ([9c5be2e](https://github.com/expressots/expressots/commit/9c5be2e8a1dc062618d048183dfeef08d67d8e70))
- fix release tag pipeline ([#12](https://github.com/expressots/expressots/issues/12)) ([d2a5491](https://github.com/expressots/expressots/commit/d2a5491dce149feb2a7b143d57ba1e08d8a2d68b))
- logo update on doc ([b2fe55b](https://github.com/expressots/expressots/commit/b2fe55b54fcac09bf261b5ea5cab4ebdbe20dee1))
- logo update on doc, build update ([b36889d](https://github.com/expressots/expressots/commit/b36889d513ed07678b43f7107ef9cd49ab5f8afa))
- non opinionated folder and prettier ([61d1e1b](https://github.com/expressots/expressots/commit/61d1e1b45e9bd240d4a6fd12a71f814e0426a436))
- prettier eslint jest setup ([0f29452](https://github.com/expressots/expressots/commit/0f29452c796abefe205ece8b943efda24b383905))
- remove test-app ([767c7a5](https://github.com/expressots/expressots/commit/767c7a54ea65c228a94ba3d63e5b6739c474a96e))
- set pipeline only pr merge ([2936442](https://github.com/expressots/expressots/commit/293644285f4dd611ab6b600c462a6559f9625605))
- update main remove index.js ([8b40b11](https://github.com/expressots/expressots/commit/8b40b11c51da728db4f8760e75fee1e2724e98e0))
- update readme ([a2ef784](https://github.com/expressots/expressots/commit/a2ef7849a1c1466f8737f263ad1728f5d30b25ec))

## [0.0.7](https://github.com/expressots/expressots/compare/v0.0.2...v0.0.7) (2023-02-18)

### Bug Fixes

- fix release step ([6e4d7b9](https://github.com/expressots/expressots/commit/6e4d7b956833cf9f956c4dbb0e063d9e50f92e3e))
- fix release tag pipeline ([#12](https://github.com/expressots/expressots/issues/12)) ([d2a5491](https://github.com/expressots/expressots/commit/d2a5491dce149feb2a7b143d57ba1e08d8a2d68b))
- set pipeline only pr merge ([2936442](https://github.com/expressots/expressots/commit/293644285f4dd611ab6b600c462a6559f9625605))

## [0.0.6](https://github.com/expressots/expressots/compare/v0.0.2...v0.0.6) (2023-02-17)

### Bug Fixes

- fix pipeline release ([69e3fc4](https://github.com/expressots/expressots/commit/69e3fc497b8b4c79556663a768c1aab417c5bca6))
- fix release tag pipeline ([#12](https://github.com/expressots/expressots/issues/12)) ([d2a5491](https://github.com/expressots/expressots/commit/d2a5491dce149feb2a7b143d57ba1e08d8a2d68b))
- set pipeline only pr merge ([2936442](https://github.com/expressots/expressots/commit/293644285f4dd611ab6b600c462a6559f9625605))

## [0.0.5](https://github.com/expressots/expressots/compare/v0.0.2...v0.0.5) (2023-02-17)

### Bug Fixes

- fix pipeline on push ([da20e93](https://github.com/expressots/expressots/commit/da20e93665a7fd51f449f0c6ae71cd485028d1f4))
- fix release tag pipeline ([#12](https://github.com/expressots/expressots/issues/12)) ([d2a5491](https://github.com/expressots/expressots/commit/d2a5491dce149feb2a7b143d57ba1e08d8a2d68b))
- set pipeline only pr merge ([2936442](https://github.com/expressots/expressots/commit/293644285f4dd611ab6b600c462a6559f9625605))

## [0.0.4](https://github.com/expressots/expressots/compare/v0.0.2...v0.0.4) (2023-02-17)

### Bug Fixes

- fix release tag pipeline ([#12](https://github.com/expressots/expressots/issues/12)) ([d2a5491](https://github.com/expressots/expressots/commit/d2a5491dce149feb2a7b143d57ba1e08d8a2d68b))
- set pipeline only pr merge ([2936442](https://github.com/expressots/expressots/commit/293644285f4dd611ab6b600c462a6559f9625605))
- update pipeline ([27dd961](https://github.com/expressots/expressots/commit/27dd961230f5cd2b1b02937f8c77ead9e983e537))

## [0.0.3](https://github.com/expressots/expressots/compare/v0.0.2...v0.0.3) (2023-02-17)

### Bug Fixes

- fix release tag pipeline ([ed03d24](https://github.com/expressots/expressots/commit/ed03d24e2696279aa04c8988e2c52ba7209a7bbd))
- set pipeline only pr merge ([2936442](https://github.com/expressots/expressots/commit/293644285f4dd611ab6b600c462a6559f9625605))

## [0.0.2](https://github.com/expressots/expressots/compare/v0.1.1...v0.0.2) (2023-02-17)

### Bug Fixes

- fix pipeline for tag name ([b9ec52d](https://github.com/expressots/expressots/commit/b9ec52dc065763185f69364d8f083b1a95fa37e0))

## [0.0.1](https://github.com/expressots/expressots/compare/v0.1.1...v0.0.1) (2023-02-17)

### Bug Fixes

- fix pipeline for tag name ([b9ec52d](https://github.com/expressots/expressots/commit/b9ec52dc065763185f69364d8f083b1a95fa37e0))