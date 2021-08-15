import { ICreatePlayerDTO } from "./createPlayer.dto";
import axios from "axios";

const PLAYER_ROUTES = {
  create: `${process.env.REACT_APP_API_URL}/player/create`,
};

export const createPlayer: (input: ICreatePlayerDTO) => void = async (
  input
) => {
  await axios.post(PLAYER_ROUTES.create, input);
};
