/**
 * Banner that shows data availability for a municipality.
 *
 * Displayed on detail pages when a municipality has incomplete data,
 * indicating how many of the 11 dimensions have been evaluated.
 */

interface DataAvailabilityBannerProps {
  /** Number of dimensions with data (0-11) */
  dimensionsWithData: number;
  /** Total dimensions (11) */
  totalDimensions?: number;
  /** Optional: municipality name */
  municipioName?: string;
}

export function DataAvailabilityBanner({
  dimensionsWithData,
  totalDimensions = 11,
  municipioName,
}: DataAvailabilityBannerProps) {
  if (dimensionsWithData >= totalDimensions) return null;

  const pct = Math.round((dimensionsWithData / totalDimensions) * 100);

  if (dimensionsWithData === 0) {
    return (
      <div className="rounded-lg border border-amber-200 bg-amber-50/80 p-4 text-sm text-amber-800">
        <div className="flex items-start gap-2">
          <svg className="h-5 w-5 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
          </svg>
          <div>
            <p className="font-medium">
              {municipioName ? `${municipioName} no tiene datos cargados` : "Sin datos disponibles"}
            </p>
            <p className="mt-1 text-amber-700">
              Este municipio aun no tiene datos en ninguna de las {totalDimensions} dimensiones evaluadas.
              Los datos se completan progresivamente a medida que se procesan fuentes nacionales y municipales.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-blue-200 bg-blue-50/80 p-4 text-sm text-blue-800">
      <div className="flex items-start gap-2">
        <svg className="h-5 w-5 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="M11.25 11.25l.041-.02a.75.75 0 011.063.852l-.708 2.836a.75.75 0 001.063.853l.041-.021M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9-3.75h.008v.008H12V8.25z" />
        </svg>
        <div>
          <p className="font-medium">
            Datos parciales ({dimensionsWithData} de {totalDimensions} dimensiones — {pct}%)
          </p>
          <p className="mt-1 text-blue-700">
            Las dimensiones sin datos no se incluyen en el score total.
            El ranking refleja solo las dimensiones evaluadas.
          </p>
          {/* Progress bar */}
          <div className="mt-2 h-1.5 w-full rounded-full bg-blue-200">
            <div
              className="h-1.5 rounded-full bg-blue-500 transition-all"
              style={{ width: `${pct}%` }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
