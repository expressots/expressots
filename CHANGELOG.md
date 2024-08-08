

## [2.16.0](https://github.com/expressots/expressots/compare/2.15.0...2.16.0) (2024-08-08)


### Features

* add stack trace option on defaultErrorHandler middleware ([c9005ed](https://github.com/expressots/expressots/commit/c9005ed4e28bd76f7622f1bd006d90b18e8b0cf6))
* add urlEncodedParser default middleware ([ec44767](https://github.com/expressots/expressots/commit/ec44767e41d8a1a208bb2be1120bb13a97942b20))
* bump release-it from 17.5.0 to 17.6.0 ([bbdc3c8](https://github.com/expressots/expressots/commit/bbdc3c8ad692775f96f26ba3da952f38441aa58e))


### Bug Fixes

* remove express dependency and middlewares.spec ([b538cce](https://github.com/expressots/expressots/commit/b538cce0a9b61e43988d3190973dd79993da833b))


### Code Refactoring

* adjust command dev, build, prod ([c819625](https://github.com/expressots/expressots/commit/c819625327a3e9632d418eed0e26af7fa80dcdcc))
* remove opinionated template example ([bca45ac](https://github.com/expressots/expressots/commit/bca45ac19e4415452e6194468d54a6f34ec5c5d7))


### Tests

* ignore middleware service, utils ([6c3e6f7](https://github.com/expressots/expressots/commit/6c3e6f7af7c656ec15e5a5ced23af05eef8a0872))
* ignore spec on coverage & better comments in app-factory ([698053d](https://github.com/expressots/expressots/commit/698053deeb538fdfdff6ed4a75fd616052df4f58))

## [2.15.0](https://github.com/expressots/expressots/compare/2.14.1...2.15.0) (2024-07-17)


### Features

* bump @types/node from 20.14.9 to 20.14.10 ([2061291](https://github.com/expressots/expressots/commit/20612919e11dcaaebe06cf740e7513efc80acdf9))
* bump @typescript-eslint/eslint-plugin from 7.15.0 to 7.16.0 ([4c33e38](https://github.com/expressots/expressots/commit/4c33e38d1d3c7041c72758d1b9001b7e0788927a))
* bump @typescript-eslint/parser from 7.15.0 to 7.16.0 ([db38183](https://github.com/expressots/expressots/commit/db381837868cb0701b332ac5f23437c3bd5ba180))
* bump prettier from 3.3.2 to 3.3.3 ([1d3ee41](https://github.com/expressots/expressots/commit/1d3ee41902344a5fde5e79a0f6fafdde52ea31cd))
* bump release-it from 17.4.1 to 17.5.0 ([a4aa310](https://github.com/expressots/expressots/commit/a4aa3103f0b9df81dfa78f4de34ea3fbc7e407c9))
* bump vitest and @vitest/coverage-v8 ([f186dc3](https://github.com/expressots/expressots/commit/f186dc30c271267f0995276216a616f7b99e21ef))


### Bug Fixes

* remove git modules cmds ([be88854](https://github.com/expressots/expressots/commit/be888548ed225feb43ad6db6929bf8d820ff8e1b))
* update index ([ebb6e8e](https://github.com/expressots/expressots/commit/ebb6e8ece46e343203136e8fc502a95ce23c2440))


### Code Refactoring

* remove render from core ([70ba135](https://github.com/expressots/expressots/commit/70ba135593466cccb5d895029c588e544434dd26))

## [2.14.1](https://github.com/expressots/expressots/compare/2.14.0...2.14.1) (2024-07-04)


### Code Refactoring

* add tests for in memory db ([6914f15](https://github.com/expressots/expressots/commit/6914f156b1fae0b09ba2926e964dc7376a47b67f))
* in memory db internal provider ([168547b](https://github.com/expressots/expressots/commit/168547b79d1b1e72b9ffdc06ec1bd5f7bebae150))
* remove inversify binding dependency ([593620c](https://github.com/expressots/expressots/commit/593620c10c3bce3c4177e92ba75a74bb45a0c789))


### Tests

* increase code coverage ([ae71339](https://github.com/expressots/expressots/commit/ae713397c8f85a49b746cfb2a26c8b83a0e2727f))

## [2.14.0](https://github.com/expressots/expressots/compare/2.13.0...2.14.0) (2024-07-04)


### Features

* bump @types/node from 20.12.7 to 20.14.9 ([ca36368](https://github.com/expressots/expressots/commit/ca3636841c54ff43968e40f8005b35a262920d50))
* bump @typescript-eslint/eslint-plugin from 7.6.0 to 7.15.0 ([3255f6a](https://github.com/expressots/expressots/commit/3255f6ae16279afa35f49585c8f223f2e88c4de9))
* bump @typescript-eslint/parser from 7.6.0 to 7.15.0 ([3ac1c8c](https://github.com/expressots/expressots/commit/3ac1c8c478eb2695062ff590ef0773d276eeebaf))
* bump prettier from 3.3.1 to 3.3.2 ([56c3299](https://github.com/expressots/expressots/commit/56c329900954002d58feb0572ae6dd8f3c12b0ab))
* bump release-it and @release-it/conventional-changelog ([c68612f](https://github.com/expressots/expressots/commit/c68612fffbe1afe5586127a74a85607de7a63cb0))
* bump typescript from 5.2.2 to 5.5.3 ([ee338de](https://github.com/expressots/expressots/commit/ee338de2e7c8da77f5bd39afc42a438be708744a))
* bump vite from 5.2.8 to 5.3.3 ([0299602](https://github.com/expressots/expressots/commit/02996021fec87041dfbeee187a8f77bf3aadcd13))


### Bug Fixes

* engine bump & husky init script ([57d0549](https://github.com/expressots/expressots/commit/57d0549e4e93dd18b94bb182c29ad487963d0131))


### Code Refactoring

* [@provide](https://github.com/provide) is available through core ([6c315e4](https://github.com/expressots/expressots/commit/6c315e4ca68eb079f09d6e4a5b0f689f9bbf810c))
* add test to validate the decorator [@provide](https://github.com/provide) ([e4981c4](https://github.com/expressots/expressots/commit/e4981c44e63197cf812f4d4f3fb010bc7f0c2e4a))

## [2.13.0](https://github.com/expressots/expressots/compare/2.12.0...2.13.0) (2024-06-11)


### Features

* bump prettier from 3.3.0 to 3.3.1 ([90ff872](https://github.com/expressots/expressots/commit/90ff8725e2bba2e72d76d1b9288510dd5434bd0b))


### Code Refactoring

* update adapter-express to latest ([3905e9a](https://github.com/expressots/expressots/commit/3905e9a60ddc5b12df13a0b61e9e82e0ee74df9b))

## [2.12.0](https://github.com/expressots/expressots/compare/2.11.0...2.12.0) (2024-06-07)


### Features

* add code coverage report ([b4d4982](https://github.com/expressots/expressots/commit/b4d4982cf4cd8a0af647c5c20c5ce9aa1818d754))
* add codecov plugin bundler ([9cef3c2](https://github.com/expressots/expressots/commit/9cef3c2cf6624d24eb82b70e87dd0a2ba4ed50f6))
* add codecov plugin bundler ([1edd11f](https://github.com/expressots/expressots/commit/1edd11ff618aaeb0c51d286941c0792038fab982))
* bump @expressots/adapter-express from 1.2.1 to 1.2.2 ([6492983](https://github.com/expressots/expressots/commit/6492983a14a37589937a0586975b92969c7cbfa6))
* bump @types/node from 20.12.3 to 20.12.5 ([74924bf](https://github.com/expressots/expressots/commit/74924bf07cb5b7033c8faa70afa2462c6b37a527))
* bump @types/node from 20.12.5 to 20.12.7 ([a040456](https://github.com/expressots/expressots/commit/a04045644b140044f75ffa950adc8f132648da00))
* bump @typescript-eslint/eslint-plugin from 7.5.0 to 7.6.0 ([05e60bc](https://github.com/expressots/expressots/commit/05e60bc05e8b183b0a219df185a8fbb371e78e4e))
* bump @typescript-eslint/parser from 6.6.0 to 7.5.0 ([d2ade4b](https://github.com/expressots/expressots/commit/d2ade4b11bf3eebf996d34a8df7bf4ef96a33fcf))
* bump @typescript-eslint/parser from 7.5.0 to 7.6.0 ([6e06f7c](https://github.com/expressots/expressots/commit/6e06f7c71dc332908ac309a1ddb009b5d21c4d13))
* bump prettier from 3.2.5 to 3.3.0 ([8f68fa4](https://github.com/expressots/expressots/commit/8f68fa442cc58c92ada69577d3956e7681f701f2))
* update adapter express ver ([afcfd42](https://github.com/expressots/expressots/commit/afcfd4242e7c26291c84cacbde56902901a526bc))


### Bug Fixes

* update codecov actions ([e1637e1](https://github.com/expressots/expressots/commit/e1637e19aabdd93960f29d3c1bd11ca7504443ee))
* update codecov actions ([4c2330f](https://github.com/expressots/expressots/commit/4c2330f01426332b01233c1ecd91e9e68b353ba1))
* upgrade dotenv from 16.0.3 to 16.4.5 ([29fb00f](https://github.com/expressots/expressots/commit/29fb00f3de2ce398634662244ef454efebceb20a))
* upgrade dotenv from 16.0.3 to 16.4.5 ([de7f53e](https://github.com/expressots/expressots/commit/de7f53e4d442296bd8e6da5bf41a2acbb0f421f1))
* upgrade dotenv from 16.0.3 to 16.4.5 ([e325d6c](https://github.com/expressots/expressots/commit/e325d6cdfa834b8cde67dd993e9f1c7b9cd19e84))
* upgrade inversify from 6.0.1 to 6.0.2 ([0975b5c](https://github.com/expressots/expressots/commit/0975b5c02079575104e0c2b151c4ec0e85dcbd0e))
* upgrade reflect-metadata from 0.2.1 to 0.2.2 ([ff93c46](https://github.com/expressots/expressots/commit/ff93c4698630bd0c202012188e13fcd1b06c0c15))


### Documentation

* add codecov badge ([3964037](https://github.com/expressots/expressots/commit/39640373ed98db226b4d7ec4b6dce0fe48d6b53c))
* add npm and build badge ([79a0b87](https://github.com/expressots/expressots/commit/79a0b87b0c09007221cf618e664a4ae9fedea67d))


### Code Refactoring

* container module scope binding for unit test and remove vitest config from tsconfig base ([a93bd31](https://github.com/expressots/expressots/commit/a93bd3115ad855281f9783915d93c74d689c3fae))
* remove vitest/eslint conflict, review pr template ([5e63d64](https://github.com/expressots/expressots/commit/5e63d6475034ca62db4991a77bc5fb0581b1b0e0))
* update adapter version to 1.4 ([ab53902](https://github.com/expressots/expressots/commit/ab53902edbc94d79b69a814d90d26030702c7465))
* update dependencies and jest config ([807c03e](https://github.com/expressots/expressots/commit/807c03e3dbf3441d3535392ecabd5246e462059a))


### Tests

* add unit test application, common, console ([78c1989](https://github.com/expressots/expressots/commit/78c19895c1ed441fb5eee255fd28f1639fa89989))
* add unit test container, controller. decorator ([20591ea](https://github.com/expressots/expressots/commit/20591ea164a95fd2bbe5caa3483fd25d3582c2d7))
* add unit test env validator ([4eb63d5](https://github.com/expressots/expressots/commit/4eb63d5f16f4dcc73c4b3dff56c9cd07ef4f4f0d))
* add unit test error module ([4442d8e](https://github.com/expressots/expressots/commit/4442d8e9130fd16ed5698c6d395adf391d5c6224))
* add unit test middleware, provider, db, dto ([65e88ce](https://github.com/expressots/expressots/commit/65e88ce942aa8053b2a2cf6b0ae8283538ae44f0))

## [2.11.0](https://github.com/expressots/expressots/compare/2.10.0...2.11.0) (2024-04-04)


### Features

* bump @types/node from 20.12.2 to 20.12.3 ([430ada9](https://github.com/expressots/expressots/commit/430ada937b04ad12ca26dad1decabffe0b5299ab))


### Bug Fixes

* update adpater version to latest ([89c671d](https://github.com/expressots/expressots/commit/89c671d2905ceea8877ee5cc6c6fc8ddae262549))
* update console tests ([c639466](https://github.com/expressots/expressots/commit/c6394663749fe4ebda9ce0b54ccaa7e83593d0df))
* upgrade tsconfig-paths from 4.1.2 to 4.2.0 ([fc373a6](https://github.com/expressots/expressots/commit/fc373a64d41174351439a356afd3708aba0e8661))
* upgrade tsconfig-paths from 4.1.2 to 4.2.0 ([e8f0d68](https://github.com/expressots/expressots/commit/e8f0d68a02999d8bcf9936c1973b62a9c97119ac))


### Code Refactoring

* appfactory class ([3fde40a](https://github.com/expressots/expressots/commit/3fde40a8754e22ad377e58d2c5a0b16fcf116dd0))
* rename items for standardization and improve doc ([d01f4d1](https://github.com/expressots/expressots/commit/d01f4d191a09716fde688404506ea7895efaf127))

## [2.10.0](https://github.com/expressots/expressots/compare/2.9.1...2.10.0) (2024-03-31)


### Features

* bump @commitlint/cli from 18.0.0 to 19.2.1 ([cbdf106](https://github.com/expressots/expressots/commit/cbdf106fc72605ecd8a66300cfe5951e50c3102c))
* bump @commitlint/config-conventional from 18.6.3 to 19.1.0 ([3e283c5](https://github.com/expressots/expressots/commit/3e283c5bc40ebaf1e4528e07a01fb10e552b33ab))
* bump @release-it/conventional-changelog from 7.0.1 to 7.0.2 ([5916d10](https://github.com/expressots/expressots/commit/5916d108e878b4104fbbede6f873e8c5ec533d81))
* bump @types/express from 4.17.17 to 4.17.21 ([9d3ce90](https://github.com/expressots/expressots/commit/9d3ce906b23918183df2f237fd5f2954564290d3))
* bump @types/node from 20.4.9 to 20.12.2 ([b62d698](https://github.com/expressots/expressots/commit/b62d698156fee5811eaa4b76f19786b36f476a8f))
* bump @typescript-eslint/eslint-plugin from 6.6.0 to 6.21.0 ([f03e326](https://github.com/expressots/expressots/commit/f03e326106777964229ed3b9fef3008a30751101))
* bump eslint from 8.48.0 to 8.57.0 ([c58c68b](https://github.com/expressots/expressots/commit/c58c68bc82b055b3a459b745b2906485d7968923))
* bump eslint-config-prettier from 9.0.0 to 9.1.0 ([6003fd9](https://github.com/expressots/expressots/commit/6003fd9c43d3b108cf23c2d5e882e85f9a86adb3))
* bump inversify from 6.0.1 to 6.0.2 ([dffffdd](https://github.com/expressots/expressots/commit/dffffddbf01181da7b117ffd37cf04324e65ac89))
* bump reflect-metadata from 0.2.1 to 0.2.2 ([eb606cd](https://github.com/expressots/expressots/commit/eb606cdb28bad0a62b1e88a906fbbba297518120))
* bump release-it from 16.1.5 to 16.3.0 ([ac94b32](https://github.com/expressots/expressots/commit/ac94b3274c9e1c0b6ffd3813bb3853f9b6648312))
* bump typescript from 4.9.5 to 5.4.3 ([2f7d8a3](https://github.com/expressots/expressots/commit/2f7d8a3c8640e91034b92dfdfc133006ac777155))
* bump vite from 4.5.0 to 5.2.7 ([c53a852](https://github.com/expressots/expressots/commit/c53a852d7701b49464deb0a5499faa17396bd5fc))
* bump vitest and @vitest/coverage-v8 ([dd561f8](https://github.com/expressots/expressots/commit/dd561f8b1caf163e453347d46ca7d40529bcd833))


### Bug Fixes

* update inversify, reflect-metadata and express version, remove vulnerabilites ([62a7e92](https://github.com/expressots/expressots/commit/62a7e923c40145bf9a8899007292c02035348dad))
* update typescript to 5.2.2 rm conflict on eslin-tstree ([26e160d](https://github.com/expressots/expressots/commit/26e160ddc37e35ce5ef80af62ddf539409ee8f1c))


### Code Refactoring

* separate template tests from core ([57e6a98](https://github.com/expressots/expressots/commit/57e6a9863cc4a27039a6ba5978d9eda678fc920c))
* update app provider opinionated template ([9e45fcd](https://github.com/expressots/expressots/commit/9e45fcd01c8351cc931522e18a30434294aae695))
* update express types ([6a546d2](https://github.com/expressots/expressots/commit/6a546d2b4a4d12c6f807591a71c33887acebd29c))
* update non opinionated template ([77dd2cc](https://github.com/expressots/expressots/commit/77dd2cc00cff014a006dc56b7fa6f76dce9be25b))
* update non opinionated template ([f9d3b16](https://github.com/expressots/expressots/commit/f9d3b169f7db2d09223f8e94d19e082b544e35c9))

## [2.9.1](https://github.com/expressots/expressots/compare/2.9.0...2.9.1) (2024-03-29)


### Bug Fixes

* add non opinionated scaffold schematics name change ([35cf0cb](https://github.com/expressots/expressots/commit/35cf0cb32c621d7b5112b0306b2001bb34c210ed))


### Code Refactoring

* add expressots project commands ([523cf19](https://github.com/expressots/expressots/commit/523cf1908f3ba36377738082bf24783e45117626))
* adjust expressots build, dev, prod ([7be37a7](https://github.com/expressots/expressots/commit/7be37a7b8291ea88ab69ce72b4723780d278d405))

## [2.9.0](https://github.com/expressots/expressots/compare/2.8.0...2.9.0) (2024-03-18)


### Features

* add plugin pattern on provider manager ([f56d5b3](https://github.com/expressots/expressots/commit/f56d5b3a2ebdcca8e61e91e831ce43e6e2a90c57))


### Bug Fixes

* change expressots version to latest ([d42f0c9](https://github.com/expressots/expressots/commit/d42f0c9987ffa7a8ecc213500e39364182ba800e))
* lock lib ver, add tsconfig to package ([298201c](https://github.com/expressots/expressots/commit/298201c1442821cf63f7ed788d7f76a6a7fe79e0))
* lock versions, update to es2021 ([1ca53ca](https://github.com/expressots/expressots/commit/1ca53ca8ad6e52aea136fe48a99aab389456de93))
* remove the appcontainer return dictionary method ([3dddb86](https://github.com/expressots/expressots/commit/3dddb86bf35e08e42f43c960e796756f2b938805))
* rename logger-service to logger.provider ([3344717](https://github.com/expressots/expressots/commit/33447175665ed36c3581143bc451bf27fb4b778b))


### Code Refactoring

* adjust core op template and add full example ([ca5a843](https://github.com/expressots/expressots/commit/ca5a8436ae5a2afb57f426f6dc8b8efa0050f6b1))
* non opinionated templated structure change ([8caf0d1](https://github.com/expressots/expressots/commit/8caf0d12b3751c61dfa16bb4a70722c64763ffcd))
* update eslint config inferrable types ([845101f](https://github.com/expressots/expressots/commit/845101fa6472ab4874a220ef63ea4e8296fbd7a6))


### Continuous Integrations

* add prepublish script ([7b1478e](https://github.com/expressots/expressots/commit/7b1478e7cf1ec44b63e9f1a99354e49cb4ddaa7d))

## [2.8.0](https://github.com/expressots/expressots/compare/2.7.0...2.8.0) (2024-3-5)


### Features

* add middleware handler, config and expresso ([df60183](https://github.com/expressots/expressots/commit/df601837a771662723f25f185622de8c912f6721))
* add provide annotation to abstract class ExpressMiddleware ([49e762e](https://github.com/expressots/expressots/commit/49e762e035053d67a977d54d9f448334e931134b))
* Added it into options wiring ([58e58c1](https://github.com/expressots/expressots/commit/58e58c11693d8dfc8e235bbc5b8d62aa35493ec9))
* Added multer middleware for expressots ([522db5d](https://github.com/expressots/expressots/commit/522db5d58dd4521fd03528cf4178cbbc951a0537))
* bump @commitlint/cli from 17.8.1 to 18.0.0 ([4ddcbd4](https://github.com/expressots/expressots/commit/4ddcbd49ffe65cfa7a15b253515bb7f3446046ee))
* bump @commitlint/config-conventional from 17.8.1 to 18.0.0 ([91e1237](https://github.com/expressots/expressots/commit/91e12370f9736188805df20d4f7da378720ac43b))
* bump husky from 8.0.3 to 9.0.11 ([#170](https://github.com/expressots/expressots/issues/170)) ([342983f](https://github.com/expressots/expressots/commit/342983fe59d6ccc409f887f7a1c8f65c9469a8d7))
* bump prettier from 3.0.3 to 3.1.1 ([#145](https://github.com/expressots/expressots/issues/145)) ([2e7b812](https://github.com/expressots/expressots/commit/2e7b81226c65468edacae51407ce56c78c66a85b))
* bump prettier from 3.1.1 to 3.2.5 ([#166](https://github.com/expressots/expressots/issues/166)) ([49c148c](https://github.com/expressots/expressots/commit/49c148c2fae6b4e0260650fbbcf559c69075d9bc))
* bump reflect-metadata from 0.1.14 to 0.2.1 ([#148](https://github.com/expressots/expressots/issues/148)) ([f444982](https://github.com/expressots/expressots/commit/f444982ccbedb75f3c26b982a2a5d5d336857aae))
* bump vite from 4.4.11 to 4.5.0 ([344161c](https://github.com/expressots/expressots/commit/344161cdf0cd7f54ffaa069023241aaea04d7c5d))
* comments addressed ([8c3f55a](https://github.com/expressots/expressots/commit/8c3f55a901874c1e9c33d415157fa0a2beab9c56))
* correct expresso middleware path ([0879c10](https://github.com/expressots/expressots/commit/0879c104810256f5143dcb2206579debaf0e6a97))
* Include multer as resolver ([056d4d9](https://github.com/expressots/expressots/commit/056d4d99801f9f4af2932bcee333a1fa652b45a8))
* remove getmiddleware pipeline from interface ([0577527](https://github.com/expressots/expressots/commit/057752754e257552eddebf031cf977f663b093ed))
* Remove multer dependency / Added dynamic multer usage behavior ([6a4530b](https://github.com/expressots/expressots/commit/6a4530be243c961e5bfe50340d2c41742332e186))
* Remove multer dependency with interface defined ([5a0acd2](https://github.com/expressots/expressots/commit/5a0acd228166efc2de8f4be7078c21ed6fd34634))
* Remove multer dependency with interface defined ([8133621](https://github.com/expressots/expressots/commit/8133621108bb7f2017088d59ae6145da8606ebf7))
* update reflect metadata on templates ([#152](https://github.com/expressots/expressots/issues/152)) ([75a3312](https://github.com/expressots/expressots/commit/75a33122e0f468b9e28040b8e7eb6747252e4c6b))


### Bug Fixes

* interface types and middleware return multer ([b5223fd](https://github.com/expressots/expressots/commit/b5223fdc22eaaf1cb9b315b2aa77ad0e615e8ed3))
* remove codesee build ([#177](https://github.com/expressots/expressots/issues/177)) ([812e06d](https://github.com/expressots/expressots/commit/812e06da1b91cc7a4b0685ec70b0f0de1bd4517b))

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
