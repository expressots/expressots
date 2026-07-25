/**
 * Template types and interfaces
 */

export type TemplateCategory = "cicd" | "docker" | "kubernetes" | "migrations";

export type CICDPlatform =
	| "github"
	| "gitlab"
	| "circleci"
	| "jenkins"
	| "bitbucket"
	| "azure";

export type CIStrategy = "basic" | "comprehensive" | "security-focused";

export type DockerTemplate =
	| "production"
	| "development"
	| "compose"
	| "compose-development";

export type KubernetesTemplate =
	| "deployment"
	| "service"
	| "configmap"
	| "ingress"
	| "secrets"
	| "kustomization";

export interface TemplateInfo {
	path: string;
	version: string;
	description?: string;
	variables?: string[];
}

export interface TemplateManifest {
	version: string;
	updated: string;
	templates: {
		cicd?: Record<CICDPlatform, Record<CIStrategy, TemplateInfo>>;
		docker?: Record<DockerTemplate, TemplateInfo>;
		kubernetes?: Record<KubernetesTemplate, TemplateInfo>;
		migrations?: Record<string, Record<string, TemplateInfo>>;
	};
}

export interface TemplateVariable {
	name: string;
	value: string | number | boolean;
}

export interface RenderOptions {
	variables: Record<string, string | number | boolean | undefined>;
	conditionals?: Record<string, boolean>;
}

export interface CacheEntry<T> {
	data: T;
	timestamp: number;
	ttl: number;
}

export interface CacheConfig {
	directory: string;
	ttl: number; // in seconds
}

export interface TemplateConfig {
	repository: string;
	branch: string;
	cacheTTL: number;
}

export interface FetchResult<T> {
	data: T | null;
	source: "cache" | "remote" | "fallback";
	error?: string;
}
