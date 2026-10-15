import { MorphWidget } from "@/deck/city/morph-widget"

/*
 * The wall again, and on the click its rows lift into the city. The slide
 * needs `stepCount: 2`, which MORPH_STEPS in deck/city/morph-widget.tsx names.
 */
export function Morph() {
  return <MorphWidget />
}
