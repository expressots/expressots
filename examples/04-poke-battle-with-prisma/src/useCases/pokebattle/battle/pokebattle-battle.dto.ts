import { TPokemonContentEndpoint } from "@providers/types/battle";

interface IPokebattleBattleRequestDTO {
  pokemon1: TPokemonContentEndpoint;
  pokemon2: TPokemonContentEndpoint;
}

interface IPokebattleBattleLogResponseDTO {
  turn: number;
  attacker: string;
  defender: string;
  attack: string;
  attackType: string;
  damage: number;
}

interface IPokebattleBattleResponseDTO {
  id?: string;
  userName: string;
  playerId: string;
  pokemon1: string;
  pokemon2: string;
  log: IPokebattleBattleLogResponseDTO[];
  winner: boolean;
  winnerName: string;
  loserName: string;
  isDraw: boolean;
}

export {
  IPokebattleBattleLogResponseDTO,
  IPokebattleBattleRequestDTO,
  IPokebattleBattleResponseDTO,
};
