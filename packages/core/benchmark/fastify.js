"use strict";

const fastify = require("fastify")();
fastify.get("/", async (req, res) => res.send("Hello Expresso TS!"));
fastify.listen({ port: 3000 }, () => console.log("Fastify listening on port 3000"));