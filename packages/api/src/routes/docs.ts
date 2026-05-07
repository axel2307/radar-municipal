/**
 * Documentación de la API pública.
 * Sirve un JSON tipo OpenAPI simplificado con todos los endpoints disponibles.
 */

import { Hono } from "hono";

export const docsRouter = new Hono();

const API_DOCS = {
  openapi: "3.0.0",
  info: {
    title: "Radar Municipal API",
    version: "1.0.0",
    description:
      "API pública de Radar Municipal. Provee datos de transparencia, indicadores fiscales y normativa de los 135 municipios de la Provincia de Buenos Aires.",
    contact: {
      name: "Radar Municipal",
      url: "https://radarmunicipal.ar",
    },
    license: {
      name: "CC BY 4.0",
      url: "https://creativecommons.org/licenses/by/4.0/",
    },
  },
  servers: [
    {
      url: "http://localhost:3001",
      description: "Desarrollo local",
    },
  ],
  paths: {
    "/api/municipios": {
      get: {
        summary: "Listar municipios",
        description:
          "Devuelve la lista completa de los 135 municipios de la Provincia de Buenos Aires con sus datos base.",
        parameters: [
          {
            name: "piloto",
            in: "query",
            schema: { type: "string", enum: ["true"] },
            description: "Si 'true', filtra solo los 13 municipios piloto",
          },
          {
            name: "q",
            in: "query",
            schema: { type: "string" },
            description: "Búsqueda por nombre o partido",
          },
        ],
        responses: {
          200: {
            description: "Lista de municipios",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    total: { type: "number" },
                    data: {
                      type: "array",
                      items: { $ref: "#/components/schemas/Municipio" },
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
    "/api/municipios/{id}": {
      get: {
        summary: "Detalle de un municipio",
        parameters: [
          {
            name: "id",
            in: "path",
            required: true,
            schema: { type: "string" },
            description: "Código INDEC de 6 dígitos del partido",
          },
        ],
        responses: {
          200: { description: "Datos del municipio" },
          404: { description: "Municipio no encontrado" },
        },
      },
    },
    "/api/ranking": {
      get: {
        summary: "Ranking de municipios piloto",
        description:
          "Devuelve los 13 municipios piloto ordenados por score total (promedio de transparencia, fiscal y normativa).",
        responses: {
          200: {
            description: "Ranking ordenado",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    total: { type: "number" },
                    data: {
                      type: "array",
                      items: { $ref: "#/components/schemas/RankingEntry" },
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
    "/api/municipios/{id}/scores": {
      get: {
        summary: "Scores de transparencia de un municipio",
        parameters: [
          {
            name: "id",
            in: "path",
            required: true,
            schema: { type: "string" },
          },
        ],
        responses: {
          200: { description: "Scores de transparencia con desglose" },
          404: { description: "Municipio no encontrado" },
        },
      },
    },
    "/api/export/ranking.json": {
      get: {
        summary: "Exportar ranking en JSON",
        description: "Descarga el ranking completo con metadatos en formato JSON.",
        responses: {
          200: {
            description: "Archivo JSON",
            content: { "application/json": {} },
          },
        },
      },
    },
    "/api/export/ranking.csv": {
      get: {
        summary: "Exportar ranking en CSV",
        description: "Descarga el ranking completo en formato CSV (compatible con Excel).",
        responses: {
          200: {
            description: "Archivo CSV",
            content: { "text/csv": {} },
          },
        },
      },
    },
    "/api/export/municipios.json": {
      get: {
        summary: "Exportar todos los municipios en JSON",
        responses: {
          200: { content: { "application/json": {} } },
        },
      },
    },
    "/api/export/municipios.csv": {
      get: {
        summary: "Exportar todos los municipios en CSV",
        responses: {
          200: { content: { "text/csv": {} } },
        },
      },
    },
  },
  components: {
    schemas: {
      Municipio: {
        type: "object",
        properties: {
          id: { type: "string", description: "Código INDEC de 6 dígitos" },
          nombre: { type: "string" },
          partido: { type: "string" },
          region: { type: "string", enum: ["GBA", "INTERIOR"] },
          poblacion: { type: "number", nullable: true },
          superficieKm2: { type: "number", nullable: true },
          densidad: { type: "number", nullable: true },
          urlOficial: { type: "string", nullable: true },
          esPiloto: { type: "boolean" },
        },
      },
      RankingEntry: {
        type: "object",
        properties: {
          posicion: { type: "number" },
          municipioId: { type: "string" },
          nombre: { type: "string" },
          partido: { type: "string" },
          poblacion: { type: "number", nullable: true },
          scoreTransparencia: { type: "number" },
          scoreFiscal: { type: "number", nullable: true },
          scoreNormativa: { type: "number", nullable: true },
          scoreTotal: { type: "number" },
        },
      },
    },
  },
};

docsRouter.get("/docs", (c) => {
  return c.json(API_DOCS);
});

/** HTML simple con links a la documentación */
docsRouter.get("/docs/explorer", (c) => {
  const html = `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="utf-8">
  <title>Radar Municipal API - Documentación</title>
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <style>
    body { font-family: system-ui, sans-serif; max-width: 800px; margin: 40px auto; padding: 0 20px; color: #1a1a2e; }
    h1 { color: #1e40af; }
    h2 { color: #374151; margin-top: 2em; }
    .endpoint { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 16px; margin: 12px 0; }
    .method { background: #16a34a; color: white; padding: 2px 8px; border-radius: 4px; font-size: 12px; font-weight: bold; }
    .path { font-family: monospace; font-weight: bold; margin-left: 8px; }
    .desc { margin-top: 8px; color: #6b7280; font-size: 14px; }
    a { color: #1e40af; }
    .badge { display: inline-block; background: #dbeafe; color: #1e40af; padding: 2px 8px; border-radius: 4px; font-size: 12px; }
  </style>
</head>
<body>
  <h1>Radar Municipal API</h1>
  <p>API pública de datos de transparencia municipal de la Provincia de Buenos Aires.</p>
  <p><span class="badge">Licencia: CC BY 4.0</span> <a href="/api/docs">Ver spec OpenAPI (JSON)</a></p>

  <h2>Datos</h2>
  <div class="endpoint">
    <span class="method">GET</span><span class="path">/api/municipios</span>
    <div class="desc">Lista los 135 municipios. Filtros: ?piloto=true, ?q=nombre</div>
  </div>
  <div class="endpoint">
    <span class="method">GET</span><span class="path">/api/municipios/:id</span>
    <div class="desc">Detalle de un municipio por código INDEC (ej: 060056)</div>
  </div>
  <div class="endpoint">
    <span class="method">GET</span><span class="path">/api/ranking</span>
    <div class="desc">Ranking de los 13 municipios piloto con scores</div>
  </div>
  <div class="endpoint">
    <span class="method">GET</span><span class="path">/api/municipios/:id/scores</span>
    <div class="desc">Scores de transparencia con desglose por criterio</div>
  </div>

  <h2>Exports</h2>
  <div class="endpoint">
    <span class="method">GET</span><span class="path"><a href="/api/export/ranking.json">/api/export/ranking.json</a></span>
    <div class="desc">Ranking completo en JSON con metadatos</div>
  </div>
  <div class="endpoint">
    <span class="method">GET</span><span class="path"><a href="/api/export/ranking.csv">/api/export/ranking.csv</a></span>
    <div class="desc">Ranking completo en CSV (compatible con Excel)</div>
  </div>
  <div class="endpoint">
    <span class="method">GET</span><span class="path"><a href="/api/export/municipios.json">/api/export/municipios.json</a></span>
    <div class="desc">Los 135 municipios en JSON</div>
  </div>
  <div class="endpoint">
    <span class="method">GET</span><span class="path"><a href="/api/export/municipios.csv">/api/export/municipios.csv</a></span>
    <div class="desc">Los 135 municipios en CSV</div>
  </div>
</body>
</html>`;
  return c.html(html);
});
