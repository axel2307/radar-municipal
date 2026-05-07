import { migrate } from "drizzle-orm/node-postgres/migrator";
import { createDb } from "./index";

async function runMigrations() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    console.error("DATABASE_URL no está configurada. Saltando migraciones.");
    process.exit(1);
  }

  const db = createDb(databaseUrl);

  console.log("Ejecutando migraciones...");
  await migrate(db, { migrationsFolder: "./drizzle" });
  console.log("Migraciones completadas.");

  process.exit(0);
}

runMigrations().catch((err) => {
  console.error("Error en migraciones:", err);
  process.exit(1);
});
