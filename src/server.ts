import { app } from "./app";
import { Env } from "./env";

const PORT = Env.express.EXPRESS_PORT;

app.listen(PORT, ()=> console.log(`Server is listen in the PORT ${PORT}`));