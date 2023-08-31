import { provideSingleton } from "../../../decorator";
import { CorsOptions } from "../../../middleware/interfaces/cors.interface";
import { Logger } from "../../../provider/logger/logger-service";
import { FastifyPlugin } from "../application-fastify";
import { pluginResolver } from "./plugin-resolver";
/**
* Interface for configuring and managing plugins in the application.
* Provides methods to be added automatically in the application without the need to import packages.
*/
interface IPlugin {
    addCors(options?: any): void;

    addPlugin(plugin: FastifyPlugin, options?: any): void;

    getPlugins(): Map<FastifyPlugin, any>;
}

/**
 * Singleton class that implements the IConfigure interface.
 * Manages the middleware configuration for the application,
 * including adding Body Parser and retrieving all configured middlewares.
 * 
 * @see IConfigure
 */
@provideSingleton(Plugin)
class Plugin implements IPlugin {    
    private plugins: Map<FastifyPlugin, any> = new Map();
    private logger: Logger = new Logger();

    /**
     * Checks if a plugin with the given name exists in the plugin collection.
     * 
     * @param pluginName - The name of the plugin to be checked.
     * 
     * @returns A boolean value indicating whether the plugin exists or not.
     */
    private pluginExists(pluginName: string): boolean {
        const plugins = this.getPlugins();

        for (const [key, value] of plugins.entries()) {
            if (key.name === pluginName) {
                this.logger.warn(`[${pluginName}] already exists. Skipping...`, "plugin-service");
                return true;
            }
        }
        
        return false;
    }

    /**
     * Adds Cors plugin to the plugin collection using the given options.
     * 
     * @param options - Optional configuration options for the cors plugin.
     */
    public addCors(options?: any): void {
        const plugin = pluginResolver("fastifyCors", options);
        const pluginExist = this.pluginExists("fastifyCors");

        if (plugin && !pluginExist) {
            this.plugins.set(plugin, options);
        }
    }

    addPlugin(plugin: FastifyPlugin, options?: any): void {
        const pluginExist = this.pluginExists(plugin.name);

        if (pluginExist) {
            this.logger.warn(`[${plugin.name}] already exists. Skipping...`, "plugin-service");
        } else {
            this.plugins.set(plugin, options);
        }
    }

    /**
     * Retrieves all the plugin that have been added to the collection.
     * 
     * @returns An array of Fastify request handlers representing the plugins.
     */
    public getPlugins(): Map<FastifyPlugin, any> {
        return this.plugins;
    }
}

export { IPlugin, Plugin };

