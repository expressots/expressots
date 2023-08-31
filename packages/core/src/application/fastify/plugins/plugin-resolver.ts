import { Logger } from "../../../provider/logger/logger-service";
import { FastifyPlugin } from "../application-fastify";

/**
 * PluginResolver class is responsible for resolving and retrieving Fastify Plugins
 * by their names. It maintains a registry of available core plugins and provides
 * a method to retrieve them by their name. If a plugin is not installed, it logs
 * an informative message.
 */
class PluginResolver {
    private logger: Logger;
    
    constructor() {
        this.logger = new Logger();
    }

    /**
     * A registry object mapping core plugin names to their corresponding package names.
     * It is used to identify and require the plugin from the current working directory.
     */
    private pluginRegistry: { [key: string]: string } = {
        fastifyCors: "@fastify/cors",
        
    };

    /**
     * Retrieves a plugin by its name and optionally configures it with provided options.
     *
     * @param {string} pluginName - The name of the plugin to be retrieved.
     * @param {...any} options - Optional arguments to configure the plugin.
     * @returns {FastifyPlugin | null} - Returns the configured plugin or null if not found or not installed.
     */
    getPlugin(pluginName: string, ...options: any): FastifyPlugin | null {
        const packageName = this.pluginRegistry[pluginName];

        if (!packageName) {
            this.logger.error(`Plugin ${pluginName} not found`, "plugin-resolver");
            return null;
        }

        let hasPlugin = "";
        try {
            hasPlugin = require.resolve(packageName, { paths: [process.cwd()] });
        } catch (error) {
        }

        const plugin = require(hasPlugin);
        if (typeof plugin === 'function') {
            return plugin;
        } else if (plugin && typeof plugin.default === 'function') {
            return plugin.default;
        } else {
            this.logger.warn(`Plugin at ${hasPlugin} does not export a function.`, "plugin-resolver");
            return null;
        }
    }
}

/**
 * A utility function that wraps the creation and retrieval of plugin.
 * It creates a new instance of PluginResolver and calls the getPlugin method.
 *
 * @param {string} plugin - The name of the middleware to be retrieved.
 * @param {...any} options - Optional arguments to configure the plugin.
 * @returns {FastifyPlugin | null} - Returns the configured plugin or null if not found or not installed.
 */
function pluginResolver(plugin: string, ...options: any): FastifyPlugin | null {
    const resolver = new PluginResolver();
    return resolver.getPlugin(plugin, ...options);
}

export { pluginResolver };

