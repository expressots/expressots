import { buildProviderModule } from 'inversify-binding-decorators'; 
import { Container } from 'inversify';
import { serverControllerContainer } from './ControllerInversify';
import { ServerHelper } from '@providers/server/ServerHelper';

const container = new Container();

container.load(
    buildProviderModule(),
    serverControllerContainer
);

export const server = container.get<ServerHelper>(ServerHelper);

export { container };