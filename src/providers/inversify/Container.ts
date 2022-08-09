import { buildProviderModule } from 'inversify-binding-decorators';
import { Container } from 'inversify';
import { serverControllerContainer, playerControllerContainer, jwtControllerContainer } from './ControllerInversify';
import { ServerProvider } from '@providers/server/ServerProvider';

const container = new Container();

container.load(
    buildProviderModule(),
    serverControllerContainer,
    playerControllerContainer,
    jwtControllerContainer
);

export const ServerInversifyContainer = container.get<ServerProvider>(ServerProvider);

export { container };