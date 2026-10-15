import { WallWidget } from "@/deck/city/wall-widget"

/*
 * The content model as one wall of rows. Step 1 puts the question over it, for
 * the live demo to answer later. The slide needs `stepCount: 2`, which
 * WALL_STEPS in deck/city/wall-widget.tsx names.
 */
export function TheWall() {
  return <WallWidget />
}
