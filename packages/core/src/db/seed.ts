import { createDb, municipios } from "./index";
import { MUNICIPIOS } from "../constants/municipios";

async function seed() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    console.error("DATABASE_URL no está configurada. Saltando seed.");
    process.exit(1);
  }

  const db = createDb(databaseUrl);

  console.log(`Insertando ${MUNICIPIOS.length} municipios...`);

  for (const m of MUNICIPIOS) {
    await db
      .insert(municipios)
      .values({
        id: m.id,
        nombre: m.nombre,
        partido: m.partido,
        urlOficial: m.urlOficial,
        poblacion: m.poblacion,
        superficieKm2: m.superficieKm2,
        densidad: m.densidad,
        region: m.region,
        esPiloto: m.esPiloto,
      })
      .onConflictDoNothing();
  }

  console.log("Seed completado.");
  process.exit(0);
}

seed().catch((err) => {
  console.error("Error en seed:", err);
  process.exit(1);
});
