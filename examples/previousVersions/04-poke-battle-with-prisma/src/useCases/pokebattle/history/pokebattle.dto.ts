interface IPokebattleHistoryRequestDTO {
  id: string;
}

interface IPokebattleHistoryResponseDTO {
  id?: string;
  userName: string;
  playerId: string;
  pokemon1: string;
  pokemon2: string;
  log: IPokebattleHistoryBattleLogResponseDTO[];
  winner: boolean;
  winnerName: string;
  loserName: string;
  isDraw: boolean;
}

interface IPokebattleHistoryBattleLogResponseDTO {
  turn: number;
  attacker: string;
  defender: string;
  attack: string;
  attackType: string;
  damage: number;
}

export { IPokebattleHistoryRequestDTO, IPokebattleHistoryResponseDTO };
