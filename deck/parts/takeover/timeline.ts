/*
 * The takeover, in seconds from the click. The shader and the DOM layers
 * read the same numbers, so the typed lines, the rain and the decoded title
 * stay in step whether the sequence plays live or is scrubbed for a
 * recording.
 */
export const timeline = {
  // The corporate slide breaks up until the tube gives out.
  crtStart: 1.8,
  // The picture is squeezed to a bright line...
  crtLine: 2.1,
  // ...the line to a dot...
  crtDot: 2.32,
  // ...and the dot fades to black.
  crtEnd: 2.9,
  // A prompt types into the dark.
  wakeStart: 3.3,
  wakeEnd: 6.2,
  // Rain floods out from the centre, column by column.
  rainStart: 6.2,
  rainSpread: 1.1,
  // Cells inside the title lock as drops run through them.
  lockStart: 7.3,
  lockEnd: 9.3,
  // The crisp title decodes over the locked cells, then the credits.
  titleStart: 9.5,
  creditsStart: 10.4,
  // From here the rain idles behind a finished title slide.
  settle: 11.6,
} as const

export const wakeLines = ["Wake up, Umbraco...", "The schema has you."]
