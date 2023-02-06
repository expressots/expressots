import { IEnv } from "../application";
declare class Console {
    private printColor;
    messageServer(port: any, env?: IEnv): Promise<void>;
}
export { Console };
