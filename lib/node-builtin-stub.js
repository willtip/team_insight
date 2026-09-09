/**
 * Stub for the Node built-ins (`node:fs`, `node:https`) that pptxgenjs imports.
 *
 * pptxgenjs guards those imports behind a runtime `isNode` check, so in the
 * browser they are resolved by the bundler but never evaluated. Webpack cannot
 * resolve the `node:` scheme for a browser target, so next.config.mjs rewrites
 * those requests — and only those, only from inside pptxgenjs — to this file.
 */
export const promises = {}
export default {}
