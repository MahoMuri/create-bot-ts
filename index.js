#!/usr/bin/env node
"use strict";

const { main } = require("./src/main");

main().catch((error) => {
    console.error(error);
    process.exit(1);
});
