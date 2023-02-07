import { Application } from '@expressots/core';
import { provide } from 'inversify-binding-decorators';

@provide(App)
class App extends Application {

    protected configureServices(): void { }

    protected postServerInitialization(): void { }

    protected serverShutdown(): void { }
}

const appInstance = new App();

export { appInstance as App }; 