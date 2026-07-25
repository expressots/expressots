"use strict";

const Hapi = require("@hapi/hapi");

const init = async () => {
    const server = Hapi.server({
        port: 3000,
        host: "localhost",
        routes: {
            cors: true
        }
    });

    server.route({ method: "GET", path: "/", handler: (request, h) => "Hello Expresso TS!" });

    await server.start();
    console.log("Happi Server running on %s", server.info.uri);
};

process.on("unhandledRejection", (err) => {
    console.log(err);
    process.exit(1);
});

init();

