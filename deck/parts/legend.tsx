import { LegendWidget } from "@/deck/city/legend-widget"

/*
 * One building assembles a mapping per click. The slide needs `stepCount: 6`,
 * which LEGEND_STEPS in deck/city/legend-widget.tsx names.
 */
export function Legend() {
  return <LegendWidget />
}
