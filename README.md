<p align="center">
  <a href="https://expresso-ts.com/" target="blank"><img src="https://github.com/expressots/expressots/blob/main/media/alogo.png" width="120" alt="Expresso TS Logo" /></a>
</p>

# Expresso TS

A Typescript + [Node.js]("https://nodejs.org/en/") lightweight framework for quick building scalable, easy to read and maintain, server-side applications 🚀

## Philosophy

Expresso TS is a framework designed to make the lives of the developers easier by providing a structure for building server-side applications that is clear to read, maintain and scale. The philosophy is centered around the idea that developers should not have to waste time on repetitive tasks such as setting up a logging system, authentication, error handling, database connection, and organizing the project for better maintainability.

Expresso TS offers a solution that is designed to help developers jump ahead and focus on the most important part of the development process, writing code. The framework provides capability to the developers to quickly extend the framework functionalities by creating providers and adding them to the dependency injection system. This way, developers can use these new functionalities throughout the entire application without having to worry about the complexities of integrating it into the system.

## The Project Structure

### Clean code using solid principles with Nodejs and Typescript

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

## Key Features

-   Module mapping (tsconfig-paths) : Entity, Provider, Use case, repository, controller examples
-   IOC (Inversion of control): Dependency Injection with InversifyJS
-   API Decorators: HttpGet, HttpPost, HttpPut, HttpDelete, HttpPatch, HttpOptions, HttpHead
-   Error handling
-   API Logger : Morgan
-   Application General Logger: Winston
-   App container and module creation

## Feature Details

-   **Module Mapping**: Using the tsconfig-paths module, we are mapping the entities, providers, repositories, use cases folders, so that we can import them using relative paths. This allows us to create a project structure that is configured using a development pattern.

```json
"paths": {
      "@entities/*": ["entities/*"],
      "@providers/*": ["providers/*"],
      "@repositories/*": ["repositories/*"],
      "@useCases/*": ["useCases/*"],
    },
```

-   **IOC**: Using InversifyJS we are creating the IoC container and registering all the dependencies. The project contains AppContainer class to register the modules, and a mechanism to create modules in which controllers can bind to it.

AppContainer for registering the modules:

```typescript
const container = new Container();

container.load(buildProviderModule(), UserContainerModule);

export { container };
```

Creating the modules and registering the controllers:

```typescript
export const UserContainerModule = CreateModule([
    CreateUserController,
    DeleteUserController,
    FindByIdController,
    UpdateUserController,
    FindAllUsersController,
]);
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
    const error = Report.Error(new ApplicationError(StatusCode.BadRequest, "User already exist!"), "user-create");
    return error;
}
```

-   **API Request Logger**: Morgan is a logger for nodejs. It is a middleware that logs the requests and responses in a file.

```Text
[localhost ::ffff:127.0.0.1]-[2023-02-02 17:2:16]-[pid: 48644] POST /user/create 151 - 0.007 ms - -
```

-   **Application General Logger**: Winston is a logger for nodejs. It is a middleware that logs all the other exceptions in a file.

```Text
[2023-02-01 20:27:58] [core-api] [user-create] error: User already exist! - (Error) [file:  CreateUserUseCase.<anonymous> (<app_path>\src\useCases\user\create\CreateUser.UseCase.ts:31:50)]
```

How To Log:

```typescript
Log(LogLevel.Error, error, this.serviceName);
```

-   LogLevel: enum with the following values: Debug, Error, Info
-   error: Error object
-   serviceName: is the name of the service that is generating the error

## Getting Started

To get started with Expresso TS, simply clone the repository and follow the below steps

```
1. run `yarn install` to install all dependencies
2. run `yarn start` to start the project

3. run the docker-compose file to create the mongodb container
4. create the user and password in mongodb and apply management rights
5. add the user and password to the .env file
```

## Documentation

To be developed

## Contributing Guide

```
1. Clone it to your local
2. Contribute to it
3. Push it to your remote repo
4. Send a PR to the main repo with your branch
5. Your contribution will be evaluated then we will merge your changes with the original repository.
```
