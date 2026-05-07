import { serve } from "@hono/node-server";
import { app } from "./app";

const port = Number(process.env.PORT ?? 3001);

console.log(`Radar Municipal API iniciando en puerto ${port}...`);
serve({ fetch: app.fetch, port });
console.log(`API disponible en http://localhost:${port}`);
