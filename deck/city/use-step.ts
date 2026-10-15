"use client"

import { useSlideStepper } from "@thebuilder/deckard-core/components"

/**
 * The slide's current step, or 0 outside a stepper. A widget also takes `step`
 * as a prop, so a slide can pin it, and reads the stepper when the slide does not.
 */
export function useStep(step?: number): number {
  const stepper = useSlideStepper()
  return step ?? stepper?.currentStep ?? 0
}
