/**
 * Template system exports
 */

export * from "./types";
export { TemplateCache, getTemplateCache } from "./cache";
export { GitHubFetcher, getGitHubFetcher, resetFetcher } from "./fetcher";
export { TemplateRenderer, getTemplateRenderer } from "./renderer";
export { TemplateManager, getTemplateManager, resetTemplateManager } from "./manager";
export { templatesCommand } from "./cli";
export type { TemplateManagerConfig } from "./manager";
export type { FetcherConfig } from "./fetcher";
