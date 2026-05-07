# Diccionario de datos

## Municipio

| Campo | Tipo | Descripción |
|-------|------|-------------|
| id | string(6) | Código INDEC de 6 d��gitos (provincia 06 + código de partido) |
| nombre | string | Nombre del partido |
| partido | string | Nombre del partido (redundante con nombre en la mayoría de casos) |
| urlOficial | string? | URL del sitio web oficial del municipio |
| poblacion | number? | Población según Censo INDEC 2022 |
| superficieKm2 | number? | Superficie en kilómetros cuadrados |
| densidad | number? | Densidad poblacional (hab/km²) |
| region | enum | Clasificación regional: AMBA, CONURBANO_SUR, CONURBANO_NORTE, CONURBANO_OESTE, INTERIOR, COSTA_ATLANTICA |
| esPiloto | boolean | Si es uno de los 13 municipios piloto del proyecto |

## Source (Fuente)

| Campo | Tipo | Descripción |
|-------|------|-------------|
| tipo | enum | PORTAL_TRANSPARENCIA, SIBOM, DATOS_ABIERTOS, BOLETIN_OFICIAL, OTRO |
| estado | enum | ACTIVO, CAIDO, NO_ENCONTRADO |

## Document (Documento)

| Campo | Tipo | Descripción |
|-------|------|-------------|
| categoria | enum | PRESUPUESTO, EJECUCION, SEF, DEUDA, FINALIDAD_FUNCION, ORDENANZA_FISCAL, LICITACION, ADJUDICACION, OTRO |
| formato | enum | PDF, CSV, XLS, HTML, JSON |
| esParseable | boolean | Si el documento es procesable automáticamente |

## TransparencyScore

| Campo | Tipo | Descripción |
|-------|------|-------------|
| dimensionScores | JSON | Array de scores por dimensión de scoring |
| scoreTotal | number | Score ponderado total (0-100) |
| evidencia | JSON | Array de evidencia con documentId, criterio, valor, peso |
