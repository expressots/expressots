interface IBattleDTO {
  id?: string;
  userName: string;
  playerId: string;
  pokemon1: string;
  pokemon2: string;
  log: {
    turn: number;
    attacker: string;
    defender: string;
    attack: string;
    attackType: string;
    damage: number;
  }[];
  winner: boolean;
  winnerName: string;
  loserName: string;
  isDraw: boolean;
}

export { IBattleDTO };
