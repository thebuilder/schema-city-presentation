import { LadderWidget } from "@/deck/city/ladder-widget"

/*
 * The same content model as a tree, a list, a graph and a city, one click each.
 * The slide needs `stepCount: 3`, which LADDER_STEPS in
 * deck/city/ladder-widget.tsx names, and a fullscreen layout with the header
 * and footer hidden, since the widget draws its own one-word label.
 */
export function Ladder() {
  return <LadderWidget />
}
