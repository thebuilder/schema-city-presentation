import { wgslTurbopackRule } from "@vgpu/wgsl/next"
import type { NextConfig } from "next"

/*
 * Slides import Schema City's own scene, layout and model modules from the
 * submodule in vendor/umbraco-schema-city rather than copies of them, so the
 * city on a slide is the city in the package. Those modules import React and
 * three by bare name. If the submodule's client ever gets its own
 * node_modules, resolving from its folder would load a second React, which
 * breaks hooks, and a second three, which breaks instanceof. Pinning every
 * shared package to this app's node_modules keeps one copy of each.
 */
const shared = [
  "react",
  "react-dom",
  "three",
  "@react-three/fiber",
  "@react-three/drei",
  "@dagrejs/dagre",
]

const nextConfig: NextConfig = {
  turbopack: {
    resolveAlias: Object.fromEntries(
      shared.flatMap((name) => [
        [name, `./node_modules/${name}`],
        [`${name}/*`, `./node_modules/${name}/*`],
      ]),
    ),
    // The takeover's shader is a .wgsl file, prepared at build time so the
    // browser never loads the WGSL parser.
    rules: {
      "*.wgsl": wgslTurbopackRule({ minify: true }),
    },
  },
}

export default nextConfig
