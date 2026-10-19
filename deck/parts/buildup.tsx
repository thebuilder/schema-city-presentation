import { BuildupWidget } from "@/deck/city/buildup-widget"

/*
 * One row of the wall built up into a building, then the pull-up to the whole
 * city. The slide needs `stepCount: 7`, which BUILDUP_STEPS in
 * deck/city/buildup-widget.tsx names.
 */
export function Buildup() {
  return <BuildupWidget />
}
