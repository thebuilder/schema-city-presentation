import "server-only"

import { codeToTokens, createCssVariablesTheme } from "shiki"

/*
 * Shiki tokenises on the server and writes each token's colour as a custom
 * property rather than a hex value, so the code panel maps the properties onto
 * the deck's own tokens and the code follows the theme and the colour mode.
 */
const theme = createCssVariablesTheme({
  fontStyle: true,
  name: "deck",
  variablePrefix: "--code-",
})

export type Token = { content: string; color?: string; italic?: boolean }

/** Bit 1 of a Shiki font style is italic. */
const ITALIC = 1

export async function highlight(
  code: string,
  lang: "ts" | "glsl"
): Promise<Token[][]> {
  const { tokens } = await codeToTokens(code.trim(), { lang, theme })
  return tokens.map((line) =>
    line.map(({ content, color, fontStyle }) => ({
      color,
      content,
      italic: ((fontStyle ?? 0) & ITALIC) !== 0,
    }))
  )
}
