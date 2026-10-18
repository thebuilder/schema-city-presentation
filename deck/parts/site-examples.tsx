import { AddPropertyWidget } from "@/deck/examples/add-property-widget"
import { DeletedBlockWidget } from "@/deck/examples/deleted-block-widget"
import { SiteIntro as SiteIntroView } from "@/deck/examples/site-intro"
import { addPropertyExample, deletedBlockExample, siteCity } from "@/deck/examples/site-results"

/*
 * The constructed examples that follow the live demo. ct-baseline has no errors
 * and a flat structure, so these run Schema City over a site built to have both,
 * deck/examples/site-schema.ts. Each part works its answer out on the server and
 * hands the client only the graph and what the scene draws.
 */
export function SiteIntro() {
  return <SiteIntroView graph={siteCity()} text="Now, a messier site." />
}

export function AddProperty() {
  return <AddPropertyWidget example={addPropertyExample()} graph={siteCity()} />
}

export function DeletedBlock() {
  return <DeletedBlockWidget example={deletedBlockExample()} graph={siteCity()} />
}
