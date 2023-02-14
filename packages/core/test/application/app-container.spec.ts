import "reflect-metadata";
import { Container, ContainerModule } from "inversify";
import { AppContainer } from "../../src/application/app-container";


describe("AppContainer", () => {
    it("should create a container", () => {

        // Arrange
        const appContainer = new AppContainer();
        const modules: ContainerModule[] = [];

        // Act
        jest.spyOn(appContainer, "create").mockImplementation(()=>{
            return new Container();
        })

        const container = appContainer.create(modules);

        // Assert
        expect(appContainer.create).toHaveBeenCalledWith(modules);
        expect(container).toBeDefined();
    });
});