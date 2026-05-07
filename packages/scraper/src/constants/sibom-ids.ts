/**
 * Mapeo de código INDEC de municipio → ID de SIBOM
 * Fuente: https://sibom.slyt.gba.gob.ar/cities
 * Actualizado: 2026-03-30
 *
 * Los IDs de SIBOM son internos del sistema y no siguen
 * el mismo esquema que los códigos INDEC de 6 dígitos.
 */

export const SIBOM_CITY_IDS: Record<string, number> = {
  // Pilotos
  "060056": 9,    // Bahía Blanca
  "060357": 55,   // General Pueyrredón
  "060791": 121,  // Tandil
  "060861": 131,  // Vicente López
  "060735": 115,  // San Isidro
  "060441": 66,   // La Plata
  "060882": 134,  // Zárate
  "060490": 76,   // Luján
  "060042": 7,    // Ayacucho
  "060476": 73,   // Lobería
  "060049": 8,    // Azul
  "060105": 16,   // Bragado
  "060567": 89,   // Necochea
  // Resto de partidos (algunos mapeos útiles)
  "060007": 1,    // Adolfo Alsina
  "060014": 2,    // Adolfo Gonzales Chaves
  "060021": 3,    // Alberti
  "060028": 4,    // Almirante Brown
  "060035": 5,    // Arrecifes
  "060063": 6,    // Avellaneda
  "060070": 10,   // Balcarce
  "060077": 11,   // Baradero
  "060084": 12,   // Benito Juárez
  "060091": 13,   // Berazategui
  "060098": 14,   // Berisso
  "060547": 15,   // Bolívar
  "060112": 17,   // Brandsen
  "060119": 18,   // Campana
  "060126": 19,   // Cañuelas
  "060134": 20,   // Capitán Sarmiento
  "060140": 21,   // Carlos Casares
  "060147": 22,   // Carlos Tejedor
  "060154": 23,   // Carmen de Areco
  "060161": 24,   // Castelli
  "060168": 25,   // Colón
  "060175": 26,   // Coronel Dorrego
  "060182": 27,   // Coronel Pringles
  "060189": 28,   // Coronel Rosales
  "060196": 29,   // Coronel Suárez
  "060203": 30,   // Chacabuco
  "060210": 31,   // Chascomús
  "060217": 32,   // Chivilcoy
  "060224": 33,   // Daireaux
  "060231": 34,   // De la Costa
  "060238": 36,   // Dolores
  "060245": 37,   // Ensenada
  "060252": 38,   // Escobar
  "060260": 39,   // Esteban Echeverría
  "060266": 40,   // Exaltación de la Cruz
  "060270": 41,   // Ezeiza
  "060274": 42,   // Florencio Varela
  "060277": 43,   // Florentino Ameghino
  "060280": 44,   // General Alvarado
  "060287": 45,   // General Alvear
  "060294": 46,   // General Arenales
  "060301": 47,   // General Belgrano
  "060308": 48,   // General Guido
  "060315": 49,   // General La Madrid
  "060322": 50,   // General Las Heras
  "060329": 51,   // General Lavalle
  "060336": 52,   // General Madariaga
  "060343": 53,   // General Paz
  "060350": 54,   // General Pinto
  "060364": 56,   // General Rodríguez
  "060371": 57,   // General San Martín
  "060378": 58,   // General Viamonte
  "060385": 59,   // General Villegas
  "060392": 60,   // Guaminí
  "060399": 61,   // Hipólito Yrigoyen
  "060406": 62,   // Hurlingham
  "060408": 63,   // Ituzaingó
  "060410": 64,   // José C. Paz
  "060412": 65,   // Junín
  "060420": 67,   // Lanús
  "060427": 68,   // Laprida
  "060434": 69,   // Las Flores
  "060448": 70,   // Leandro N. Alem
  "060451": 71,   // Lezama
  "060455": 72,   // Lincoln
  "060462": 74,   // Lobos
  "060469": 75,   // Lomas de Zamora
  "060483": 77,   // Magdalena
  "060497": 78,   // Maipú
  "060505": 79,   // Malvinas Argentinas
  "060511": 80,   // Mar Chiquita
  "060515": 81,   // Marcos Paz
  "060519": 82,   // Mercedes
  "060525": 83,   // Merlo
  "060528": 84,   // Monte
  "060531": 85,   // Monte Hermoso
  "060535": 86,   // Moreno
  "060539": 87,   // Morón
  "060553": 88,   // Navarro
  "060560": 90,   // Nueve de Julio
  "060574": 91,   // Olavarría
  "060581": 92,   // Patagones
  "060588": 93,   // Pehuajó
  "060595": 94,   // Pellegrini
  "060602": 95,   // Pergamino
  "060609": 96,   // Pila
  "060616": 35,   // Pilar
  "060620": 97,   // Pinamar
  "060624": 98,   // Presidente Perón
  "060630": 99,   // Puán
  "060631": 100,  // Punta Indio
  "060638": 101,  // Quilmes
  "060644": 102,  // Ramallo
  "060648": 103,  // Rauch
  "060651": 104,  // Rivadavia
  "060655": 105,  // Rojas
  "060658": 106,  // Roque Pérez
  "060665": 107,  // Saavedra
  "060672": 108,  // Saladillo
  "060676": 109,  // Salliqueló
  "060679": 110,  // Salto
  "060686": 111,  // San Andrés de Giles
  "060693": 112,  // San Antonio de Areco
  "060700": 113,  // San Cayetano
  "060707": 114,  // San Fernando
  "060721": 116,  // San Miguel
  "060728": 117,  // San Nicolás
  "060742": 118,  // San Pedro
  "060749": 119,  // San Vicente
  "060756": 120,  // Suipacha
  "060763": 122,  // Tapalqué
  "060770": 123,  // Tigre
  "060778": 124,  // Tordillo
  "060784": 125,  // Tornquist
  "060798": 126,  // Trenque Lauquen
  "060805": 127,  // Tres Arroyos
  "060812": 128,  // Tres de Febrero
  "060819": 129,  // Tres Lomas
  "060826": 130,  // Veinticinco de Mayo
  "060833": 132,  // Villa Gesell
  "060840": 133,  // Villarino
  "060462b": 136, // La Matanza (special SIBOM ID)
};

/** Obtener el ID de SIBOM para un municipio dado su código INDEC */
export function getSibomCityId(municipioId: string): number | null {
  return SIBOM_CITY_IDS[municipioId] ?? null;
}
