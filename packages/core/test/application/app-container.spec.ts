import 'reflect-metadata';
import { Container, ContainerModule } from "inversify"
import { AppContainer } from "../../src/application/app-container"

describe('AppContainer', () => {
  test('Should create a container', () => {
    // Arrange
    const sut = new AppContainer()
    const fakeModules = [new ContainerModule(() => { })]

    // Act
    const createSpy = jest.spyOn(sut, 'create')
    const container = sut.create(fakeModules)

    // Assert
    expect(createSpy).toHaveBeenCalledWith(fakeModules)
    expect(container).toBeInstanceOf(Container)
  })
})
