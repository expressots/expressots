import 'reflect-metadata';
import { Container, ContainerModule } from "inversify"
import { AppContainer } from "../../src/application/app-container"

describe('AppContainer', () => {
  test('Should create a container', () => {
    const sut = new AppContainer()
    const createSpy = jest.spyOn(sut, 'create')
    const fakeModules = [new ContainerModule(() => { })]
    const container = sut.create(fakeModules)
    expect(createSpy).toHaveBeenCalledWith(fakeModules)
    expect(container).toBeInstanceOf(Container)
  })
})
