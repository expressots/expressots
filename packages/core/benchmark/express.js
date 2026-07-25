"use strict";

const express = require("express");

const app = express();

app.get("/", async (req, res) => res.send("Hello Expresso TS!"));
app.listen(3000, () => console.log("Express listening on port 3000"));
