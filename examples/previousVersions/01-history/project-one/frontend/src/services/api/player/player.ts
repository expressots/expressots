import { ICreatePlayerDTO } from "./createPlayer.dto";
import axios from "axios";

const PLAYER_ROUTES = {
  create: 'http://localhost:3001/player/create',
};

export const createPlayer: (input: ICreatePlayerDTO) => void = async (
  input
) => {
  await axios.post(PLAYER_ROUTES.create, input);
};
