export interface PresetConfig {
	name: string;
	description: string;
	baseImage?: string;
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
			enabled: false,
		},
		healthCheck: {
			enabled: false,
		},
	},

	minimal: {
		name: "Minimal",
		description: "Smallest possible image size (<100MB)",
		baseImage: "node:22-alpine",
		multiStage: true,
		security: {
			enabled: false,
		},
		healthCheck: {
			enabled: false,
		},
		optimization: {
			layerCaching: true,
			minimalDependencies: true,
		},
	},

	secure: {
		name: "Secure",
		description: "Security-hardened configuration",
		baseImage: "node:22-alpine",
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
		baseImage: "node:22-alpine",
		multiStage: true,
		security: {
			enabled: false,
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
		baseImage: "node:22",
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
		baseImage: "node:22-alpine",
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
