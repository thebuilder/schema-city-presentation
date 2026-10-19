import { BuildupWidget } from "@/deck/city/buildup-widget"

/*
 * Content page built up into a building, then the pull-up to the whole
 * city. The slide needs `stepCount: 6`, which BUILDUP_STEPS in
 * deck/city/buildup-widget.tsx names.
 */
export function Buildup() {
  return <BuildupWidget />
}
