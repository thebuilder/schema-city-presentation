import { BrokenWidget } from "@/deck/examples/broken-widget"
import { ChangesWidget } from "@/deck/examples/changes-widget"
import { ParkIntro as ParkIntroView } from "@/deck/examples/park-intro"
import {
  brokenExample,
  changesExample,
  parkCity,
  parkCityAfter,
  reachExample,
} from "@/deck/examples/park-results"
import { ReachWidget } from "@/deck/examples/reach-widget"

/*
 * The constructed examples that follow the live demo. ct-baseline has no errors
 * and a flat structure, so these run Schema City over a park built to have both,
 * deck/examples/park-schema.ts. Each part works its answer out on the server and
 * hands the client only the graph and the rows it prints.
 */
export function ParkIntro() {
  return <ParkIntroView graph={parkCity()} text="Dennis Nedry built this one." />
}

export function ParkBroken() {
  return <BrokenWidget example={brokenExample()} graph={parkCity()} />
}

export function ParkReach() {
  return <ReachWidget example={reachExample()} graph={parkCity()} />
}

export function ParkChanges() {
  return <ChangesWidget example={changesExample()} graph={parkCityAfter()} />
}
