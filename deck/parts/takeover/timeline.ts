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
  // The camera dives into the U of "Umbraco". Close up, the letter turns out
  // to be made of rain, and the dive ends inside its stroke, where the rain
  // is all there is.
  diveStart: 6.3,
  diveEnd: 8.6,
  // Cells inside the title lock as drops run through them.
  lockStart: 8.8,
  lockEnd: 10.6,
  // The crisp title decodes over the locked cells, then the credits.
  titleStart: 10.8,
  creditsStart: 11.6,
  // From here the rain idles behind a finished title slide.
  settle: 12.8,
} as const

export const wakeLines = ["Wake up, Umbraco...", "The schema has you."]

// The letter the dive ends in: the U of "Umbraco".
export const diveInto = { index: wakeLines[0].indexOf("U"), line: 0 }
