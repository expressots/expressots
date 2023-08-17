import { Container } from "inversify";
import { Application } from "./application";
import { IApplication } from "./application.interfaces";

class AppFactory { 
    public static async create<T extends Application>(container: Container, CustomAppType?: new ()=> T): Promise<IApplication> {
        let app: Application;
        
        if (CustomAppType) {
            app = new CustomAppType();
        } else {
            app = container.get<Application>(Application);
        }

        app.create(container);
        return app as IApplication;
    }
}

export { AppFactory };

