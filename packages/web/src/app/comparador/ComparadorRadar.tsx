"use client";

import { RadarChart, type RadarSeries } from "@/components/RadarChart";

/**
 * Sprint 44A — Wrapper client de RadarChart para uso desde server page.
 *
 * RadarChart requiere DOM (Recharts), así que es client. El page server
 * computa las series (data shape) y se las pasa serializadas como prop.
 * Cero state local — re-render limpio cuando cambian las searchParams.
 */
interface ComparadorRadarProps {
  series: RadarSeries[];
}

export function ComparadorRadar({ series }: ComparadorRadarProps) {
  return <RadarChart height={380} series={series} />;
}
