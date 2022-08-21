# Clean Architecture Idea

## Clean code using solid principles with Nodejs and Typescript

The idea of this project is to offer a clean and concise architecture boilerplate for those trying to navigate on node development.

It respects the fundamentals of clean code and some of the SOLID concepts. This boilerplate has my own flavour, which means that I don't follow follow strictly all the concepts, I rather customize to my own needs. I tried to extract the best practices of the 5 main principles:

-   **_S_**: Single responsibility
-   **_O_**: Open-Close
-   **_L_**: Liskov substitution
-   **_I_**: Interface segregation
-   **_D_**: Dependency inversion

`Reference:` [Uncle Bob article](http://butunclebob.com/ArticleS.UncleBob.PrinciplesOfOod)

> ![Clean Architecture](https://github.com/rsaz/cleanArchitecture01/blob/main/media/CleanArchitecture.jpg)

-   **_Entities_**: class definitions, or models with their attributes, properties and methods.
-   **_Providers_**: is the layer responsible to provide externals resources such as database, email services. Everything external to the application.
-   **_Repositories_**: is the layer responsible to communicate with the database.
-   **_Use Cases_**: use cases represents the implementation of an operation that can be performed in the system

## Features

```
- Module mapping (tsconfig-paths)
- IOC (Inversion of control): Dependency Injection with InversifyJS
- API Decorators: HttpGet, HttpPost, HttpPut, HttpDelete, HttpPatch, HttpOptions, HttpHead
- Entity, Provider, Use case, repository, controller examples
- Error handling
- Morgan Logger
- Exception Logger (winston)
- Authentication using JWT
- Frontend example using react, yup and formik
```

## Feature Details

-   **Module Mapping**: Using the tsconfig-paths module, we are mapping the entities, providers, repositories, use cases folders, so that we can import them using relative paths.

```json
"paths": {
      "@entities/*": ["entities/*"],
      "@providers/*": ["providers/*"],
      "@repositories/*": ["repositories/*"],
      "@useCases/*": ["useCases/*"],
    },
```

-   **IOC**: Using InversifyJS we are creating the IoC container and registering all the dependencies. Provider `inversify` contains two files, ContainerProvider and BindingProvider called `ContainerModule.Provider`. An example of controllers being registered is shown below.

```typescript
export const playerContContainerModule = new ContainerModule(
    (bind: interfaces.Bind, unbind: interfaces.Unbind) => {
        bind<CreatePlayerController>(TYPES.CreatePlayerController).to(
            CreatePlayerController
        );
        bind<FindAllPlayersController>(TYPES.FindAllPlayersController).to(
            FindAllPlayersController
        );
        bind<FindPlayerController>(TYPES.FindPlayerController).to(
            FindPlayerController
        );
        bind<DeletePlayerController>(TYPES.DeletePlayerController).to(
            DeletePlayerController
        );
        bind<UpdatePlayerController>(TYPES.UpdatePlayerController).to(
            UpdatePlayerController
        );
    }
);
```

-   **API Decorators**: Using the decorators we are creating the endpoints for the controllers.

```typescript
@controller('/user/create')
   @httpPost('/')
```

-   **Entity, Provider, Use case, repository, controller examples**: Folders organization for the clean architecture.

-   **Error handling**: Using `Report.Error()` we can report errors using predefined error codes. This is useful when we want to report known errors to the client. Inside of `Report.Error()` there is a try catch block encapsulating the error.

```typescript
type ErrorType = GeneralErrorCode | ApplicationErrorCode | HttpStatusErrorCode;

// Reporting errors
if (userExist) {
    const error = Report.Error(
        new ApplicationError(
            HttpStatusErrorCode.BadRequest,
            "User already exist!"
        ),
        true
    ) as ApplicationError;
    return error;
}
```

-   **Morgan Logger**: Morgan is a logger for nodejs. It is a middleware that logs the requests and responses in a file.

-   **Exception Logger (winston)**: Winston is a logger for nodejs. It is a middleware that logs all the other exceptions in a file.

```typescript
Log(error, "user-create");
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
