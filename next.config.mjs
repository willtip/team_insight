import path from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = path.dirname(fileURLToPath(import.meta.url))

/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  experimental: {
    optimizePackageImports: ['recharts', 'lucide-react'],
  },
  webpack: (config, { webpack }) => {
    // pptxgenjs (Reports → PowerPoint export) lazily `import()`s `node:fs` and
    // `node:https` behind a runtime `isNode` check that is never true in a
    // browser. Webpack still resolves those specifiers statically and rejects
    // the `node:` scheme, which breaks both the client and the SSR build of
    // /reports. The library's own `browser` field already stubs them out, but
    // its `exports` map has no `browser` condition, so webpack never reads it.
    //
    // The replacement is scoped to requests issued from inside pptxgenjs, so
    // `node:fs` still resolves normally everywhere else.
    config.plugins.push(
      new webpack.NormalModuleReplacementPlugin(/^node:(fs|https)$/, resource => {
        if (/[\\/]node_modules[\\/]pptxgenjs[\\/]/.test(resource.context)) {
          resource.request = path.join(ROOT, 'lib', 'node-builtin-stub.js')
        }
      }),
    )
    return config
  },
}

export default nextConfig
