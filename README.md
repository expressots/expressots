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

## Features

```
- Module mapping (tsconfig-paths)
- IOC (Inversion of control): Dependency Injection
- API Decorators: HttpGet, HttpPost, HttpPut, HttpDelete, HttpPatch, HttpOptions, HttpHead
- Entity, Provider, Use case, repository, controller examples
- Frontend example using react, yup and formik
```

## Running the project

```
1. run `yarn install` to install all dependencies
2. run `yarn start` to start the project
    1. Backend API: CleanArchitecture/src
    1. FrontEnd: frontend/src
```

## Contributing Guide

```
1. Fork the original repository to your own repository
2. Clone it to your local
3. Contribute to it
4. Push it to your remote repo
5. Send a PR to the main repo
6. Your contribution will be evaluated then we will merge your changes with the original repository.
```

## How to use JWT Secure

```
1) Create user
curl --location --request POST 'http://localhost:3000/user/create' \
--header 'Content-Type: application/json' \
--data-raw '{
    "name":"User name",
    "email":"clean@architecture.com",
    "password": "quentinada"


2) Get user token
curl --location --request POST 'http://localhost:3000/tokens' \
--header 'Content-Type: application/json' \
--data-raw '{
    "email": "clean@architecture.com",
    "password": "quentinada"
}
'

3) Create player (JWT Secure)
curl --location --request POST 'http://localhost:3000/player/create' \
--header 'Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6ImY0ODYzNDIyLTlhNWMtNDM0MS05NDU5LTVmMmUwYTgxMWQwZSIsImVtYWlsIjoicmVuYXRvanJAYWxwaHVzLmNvbS5iciIsImlhdCI6MTYyOTI0NjAzNCwiZXhwIjoxNjI5MzMyNDM0fQ.LAf7mLhfBerJ44EhwLW5AE2c_yy6gwhh4-1ONiqrz_Q' \
--header 'Content-Type: application/json' \
--data-raw '{
    "name":"Clean Archi",
    "email":"clean@architecture.com",
    "faction": "Faction name"
}
'
```
