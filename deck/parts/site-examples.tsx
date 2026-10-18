import { BrokenWidget } from "@/deck/examples/broken-widget"
import { ChangesWidget } from "@/deck/examples/changes-widget"
import { SiteIntro as SiteIntroView } from "@/deck/examples/site-intro"
import {
  brokenExample,
  changesExample,
  reachExample,
  siteCity,
  siteCityAfter,
} from "@/deck/examples/site-results"
import { ReachWidget } from "@/deck/examples/reach-widget"

/*
 * The constructed examples that follow the live demo. ct-baseline has no errors
 * and a flat structure, so these run Schema City over a site built to have both,
 * deck/examples/site-schema.ts. Each part works its answer out on the server and
 * hands the client only the graph and the rows it prints.
 */
export function SiteIntro() {
  return <SiteIntroView graph={siteCity()} text="Now, a messier site." />
}

export function SiteBroken() {
  return <BrokenWidget example={brokenExample()} graph={siteCity()} />
}

export function SiteReach() {
  return <ReachWidget example={reachExample()} graph={siteCity()} />
}

export function SiteChanges() {
  return <ChangesWidget example={changesExample()} graph={siteCityAfter()} />
}
