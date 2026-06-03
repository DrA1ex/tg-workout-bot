import * as dotenv from "dotenv";
import path from "node:path";
import {fileURLToPath} from "node:url";

import {ensureDb} from "./db/index.js";
import {getWebConfig} from "./web/server/config.js";
import {createWebServer} from "./web/server/server.js";

dotenv.config();

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, "..");
const publicDir = path.join(rootDir, "dist");
const config = getWebConfig();

await ensureDb();

const server = createWebServer({config, publicDir});

server.listen(config.port, () => {
    console.log(`Workout WebUI running at http://localhost:${config.port}`);
});
