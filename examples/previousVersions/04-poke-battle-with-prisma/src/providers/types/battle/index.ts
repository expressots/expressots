export type TPokemonContentEndpoint = {
  abilities: PokemonAbilities[];
  base_experience: number;
  forms: PokemonForm[];
  game_indices: GameIndices[];
  height: number;
  held_items: any[];
  id: number;
  is_default: boolean;
  location_area_encounters: string;
  moves: PokemonMoves[];
  name: string;
  order: number;
  past_types: any[];
  species: PokemonSpecies;
  sprites: PokemonSprites;
  stats: PokemonStats[];
  types: PokemonTypes[];
  weight: number;
};

export type PokemonAbilities = {
  ability: PokemonAbility;
  is_hidden: boolean;
  slot: number;
};

export type PokemonAbility = {
  name: string;
  url: string;
};

export type PokemonForm = {
  name: string;
  url: string;
};

export type GameIndices = {
  game_index: number;
  version: PokemonVersion;
};

export type PokemonVersion = {
  name: string;
  url: string;
};

export type PokemonMoves = {
  move: Move;
  version_group_details: PokemonVersionGroupDetail[];
};

export type Move = {
  name: string;
  url: string;
};

export type PokemonVersionGroupDetail = {
  level_learned_at: number;
  move_learn_method: PokemonMoveLearnMethod;
  version_group: PokemonVersionGroup;
};

export type PokemonMoveLearnMethod = {
  name: string;
  url: string;
};

export type PokemonVersionGroup = {
  name: string;
  url: string;
};

export type PokemonSpecies = {
  name: string;
  url: string;
};

export type PokemonSprites = {
  back_default: string;
  back_female: any;
  back_shiny: string;
  back_shiny_female: any;
  front_default: string;
  front_female: any;
  front_shiny: string;
  front_shiny_female: any;
  other: PokemonOtherSprites;
  versions: PokemonVersions;
};

export type PokemonOtherSprites = {
  dream_world: PokemonDreamWorldSprites;
  home: PokemonHomeSprites;
  "official-artwork": PokemonOfficialArtworkSprites;
};

export type PokemonDreamWorldSprites = {
  front_default: string;
  front_female: any;
};

export type PokemonHomeSprites = {
  front_default: string;
  front_female: any;
  front_shiny: string;
  front_shiny_female: any;
};

export type PokemonOfficialArtworkSprites = {
  front_default: string;
  front_shiny: string;
};

export type PokemonVersions = {
  "generation-i": PokemonGenerationI;
  "generation-ii": PokemonGenerationIi;
  "generation-iii": PokemonGenerationIii;
  "generation-iv": PokemonGenerationIv;
  "generation-v": PokemonGenerationV;
  "generation-vi": PokemonGenerationVi;
  "generation-vii": PokemonGenerationVii;
  "generation-viii": PokemonGenerationViii;
};

export type PokemonGenerationI = {
  "red-blue": PokemonRedBlue;
  yellow: PokemonYellow;
};

export type PokemonRedBlue = {
  back_default: string;
  back_gray: string;
  back_transparent: string;
  front_default: string;
  front_gray: string;
  front_transparent: string;
};

export type PokemonYellow = {
  back_default: string;
  back_gray: string;
  back_transparent: string;
  front_default: string;
  front_gray: string;
  front_transparent: string;
};

export type PokemonGenerationIi = {
  crystal: PokemonCrystal;
  gold: PokemonGold;
  silver: PokemonSilver;
};

export type PokemonCrystal = {
  back_default: string;
  back_shiny: string;
  back_shiny_transparent: string;
  back_transparent: string;
  front_default: string;
  front_shiny: string;
  front_shiny_transparent: string;
  front_transparent: string;
};

export type PokemonGold = {
  back_default: string;
  back_shiny: string;
  front_default: string;
  front_shiny: string;
  front_transparent: string;
};

export type PokemonSilver = {
  back_default: string;
  back_shiny: string;
  front_default: string;
  front_shiny: string;
  front_transparent: string;
};

export type PokemonGenerationIii = {
  emerald: PokemonEmerald;
  "firered-leafgreen": PokemonFireredLeafgreen;
  "ruby-sapphire": PokemonRubySapphire;
};

export type PokemonEmerald = {
  front_default: string;
  front_shiny: string;
};

export type PokemonFireredLeafgreen = {
  back_default: string;
  back_shiny: string;
  front_default: string;
  front_shiny: string;
};

export type PokemonRubySapphire = {
  back_default: string;
  back_shiny: string;
  front_default: string;
  front_shiny: string;
};

export type PokemonGenerationIv = {
  "diamond-pearl": PokemonDiamondPearl;
  "heartgold-soulsilver": PokemonHeartgoldSoulsilver;
  platinum: PokemonPlatinum;
};

export type PokemonDiamondPearl = {
  back_default: string;
  back_female: any;
  back_shiny: string;
  back_shiny_female: any;
  front_default: string;
  front_female: any;
  front_shiny: string;
  front_shiny_female: any;
};

export type PokemonHeartgoldSoulsilver = {
  back_default: string;
  back_female: any;
  back_shiny: string;
  back_shiny_female: any;
  front_default: string;
  front_female: any;
  front_shiny: string;
  front_shiny_female: any;
};

export type PokemonPlatinum = {
  back_default: string;
  back_female: any;
  back_shiny: string;
  back_shiny_female: any;
  front_default: string;
  front_female: any;
  front_shiny: string;
  front_shiny_female: any;
};

export type PokemonGenerationV = {
  "black-white": PokemonBlackWhite;
};

export type PokemonBlackWhite = {
  animated: PokemonAnimated;
  back_default: string;
  back_female: any;
  back_shiny: string;
  back_shiny_female: any;
  front_default: string;
  front_female: any;
  front_shiny: string;
  front_shiny_female: any;
};

export type PokemonAnimated = {
  back_default: string;
  back_female: any;
  back_shiny: string;
  back_shiny_female: any;
  front_default: string;
  front_female: any;
  front_shiny: string;
  front_shiny_female: any;
};

export type PokemonGenerationVi = {
  "omegaruby-alphasapphire": PokemonOmegarubyAlphasapphire;
  "x-y": PokemonXY;
};

export type PokemonOmegarubyAlphasapphire = {
  front_default: string;
  front_female: any;
  front_shiny: string;
  front_shiny_female: any;
};

export type PokemonXY = {
  front_default: string;
  front_female: any;
  front_shiny: string;
  front_shiny_female: any;
};

export type PokemonGenerationVii = {
  icons: PokemonIcons;
  "ultra-sun-ultra-moon": PokemonUltraSunUltraMoon;
};

export type PokemonIcons = {
  front_default: string;
  front_female: any;
};

export type PokemonUltraSunUltraMoon = {
  front_default: string;
  front_female: any;
  front_shiny: string;
  front_shiny_female: any;
};

export type PokemonGenerationViii = {
  icons: PokemonIcons2;
};

export type PokemonIcons2 = {
  front_default: string;
  front_female: any;
};

export type PokemonStats = {
  base_stat: number;
  effort: number;
  stat: PokemonStat;
};

export type PokemonStat = {
  name: string;
  url: string;
};

export type PokemonTypes = {
  slot: number;
  type: PokemonType;
};

export type PokemonType = {
  name: string;
  url: string;
};
