import { buildProviderModule } from 'inversify-binding-decorators';
import { Container } from 'inversify';
import { serverControllerContainer, playerControllerContainer, jwtControllerContainer } from './ControllerInversify';
import { ServerHelper } from '@providers/server/ServerHelper';

const container = new Container();

container.load(
    buildProviderModule(),
    serverControllerContainer,
    playerControllerContainer,
    jwtControllerContainer
);

export const server = container.get<ServerHelper>(ServerHelper);

export { container };