/*
 * The demo handoff. The question the backoffice opening left open, one line,
 * and one way out of the deck, so the switch to the backoffice is a click on
 * the slide rather than a hunt for the right tab. The demo opens Page Meta
 * first, so the question is answered on the next screen the room sees.
 */
const backoffice = "https://ct-baseline.euwest01.umbraco.io/umbraco/"

export function Live() {
  return (
    <section className="flex h-full flex-col items-center justify-center gap-16">
      <p className="font-bold text-[length:var(--slide-heading-size)] text-foreground uppercase [text-shadow:var(--slide-halo)]">
        {"What does a change to "}
        <span className="border-primary border-b-4 text-primary">Page Meta</span>
        {" reach?"}
      </p>
      <h1
        className="font-semibold text-[length:var(--slide-title-size)] text-primary leading-none tracking-[-0.02em]"
        data-slide-title=""
      >
        Let's see it
      </h1>
      <a
        className="border-2 border-primary bg-primary px-12 py-6 font-[family-name:var(--slide-font-mono)] text-[length:var(--slide-support-size)] text-primary-foreground uppercase tracking-[var(--slide-label-tracking)] shadow-[var(--slide-halo)]"
        href={backoffice}
        rel="noreferrer"
        target="_blank"
      >
        Open the backoffice
      </a>
    </section>
  )
}
