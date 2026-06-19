export interface PresetConfig {
	name: string;
	description: string;
	/**
	 * Explicit base image override. When set, it is used verbatim and
	 * takes precedence over `baseVariant` + the project's Node version.
	 * Primarily for custom/community presets that need a specific image.
	 */
	baseImage?: string;
	/**
	 * Linux distribution flavor for the (Node) base image. The generator
	 * combines this with the project's resolved Node major version to
	 * produce a valid tag: `alpine` -> `node:<major>-alpine`, `debian` ->
	 * `node:<major>`. Defaults to `alpine` when unset. Lets presets pick a
	 * distro without hardcoding (and thus pinning) the Node version.
	 */
	baseVariant?: "alpine" | "debian";
	multiStage?: boolean;
	security?: {
		enabled: boolean;
		nonRootUser?: boolean;
	};
	healthCheck?: {
		enabled: boolean;
		interval?: string;
	};
	optimization?: {
		layerCaching?: boolean;
		minimalDependencies?: boolean;
	};
}

const presets: Record<string, PresetConfig> = {
	standard: {
		name: "Standard",
		description: "Balanced configuration for most applications",
		multiStage: true,
		security: {
			enabled: true,
			nonRootUser: true,
		},
		healthCheck: {
			enabled: true,
			interval: "30s",
		},
	},

	minimal: {
		name: "Minimal",
		description: "Smallest possible image size (<100MB)",
		baseVariant: "alpine",
		multiStage: true,
		security: {
			enabled: true,
			nonRootUser: true,
		},
		healthCheck: {
			enabled: true,
			interval: "30s",
		},
		optimization: {
			layerCaching: true,
			minimalDependencies: true,
		},
	},

	secure: {
		name: "Secure",
		description: "Security-hardened configuration",
		baseVariant: "alpine",
		multiStage: true,
		security: {
			enabled: true,
			nonRootUser: true,
		},
		healthCheck: {
			enabled: true,
			interval: "30s",
		},
		optimization: {
			layerCaching: true,
		},
	},

	"fast-startup": {
		name: "Fast Startup",
		description: "Optimized for quick cold starts",
		baseVariant: "alpine",
		multiStage: true,
		security: {
			enabled: true,
			nonRootUser: true,
		},
		healthCheck: {
			enabled: true,
		},
		optimization: {
			layerCaching: true,
			minimalDependencies: true,
		},
	},

	dev: {
		name: "Development",
		description: "Development environment with hot reload",
		baseVariant: "debian",
		multiStage: false,
		security: {
			enabled: false,
		},
		healthCheck: {
			enabled: false,
		},
	},

	"multi-arch": {
		name: "Multi-Architecture",
		description: "Supports both ARM64 and x86_64",
		baseVariant: "alpine",
		multiStage: true,
		security: {
			enabled: true,
		},
		healthCheck: {
			enabled: true,
		},
	},
};

export function getPresetConfig(presetName: string): PresetConfig {
	const preset = presets[presetName];

	if (!preset) {
		console.warn(
			`Warning: Preset "${presetName}" not found. Using "standard" preset.`,
		);
		return presets.standard;
	}

	return preset;
}

export function listPresets(): PresetConfig[] {
	return Object.values(presets);
}
