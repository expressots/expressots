# Clean Architecture Idea

## Clean code using solid principles with Nodejs and Typescript

The idea of this project is to offer a clean and concise architecture boilerplate for those trying to navigate on node development.

It respects the fundamentals of clean code and some of the SOLID concepts. This boilerplate has my own flavour, which means that I don't follow follow strictly all the concepts, I rather customize to my own needs. I tried to extract the best practices of the 5 main principles:

- **_S_**: Single responsibility
- **_O_**: Open-Close
- **_L_**: Liskov substitution
- **_I_**: Interface segregation
- **_D_**: Dependency inversion

`Reference:` [Uncle Bob article](http://butunclebob.com/ArticleS.UncleBob.PrinciplesOfOod)

> ![Clean Architecture](https://github.com/rsaz/cleanArchitecture01/blob/main/media/CleanArchitecture.jpg)

- **_Entities_**: class definitions, or models with their attributes, properties and methods.
- **_Providers_**: is the layer responsible to provide externals resources such as database, email services. Everything external to the application.
- **_Repositories_**: is the layer responsible to communicate with the database.
- **_Use Cases_**: use cases represents the implementation of an operation that can be performed in the system

## Contributing Guide

```
1. Fork the original repository to your own repository
2. Clone it to your local
3. Contribute to it
4. Push it to your remote repo
5. Send a PR to the main repo
6. Your contribution will be evaluated then we will merge your changes with the original repository.
```
