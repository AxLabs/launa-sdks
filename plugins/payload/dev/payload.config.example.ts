import type { Config } from 'payload'
import { ax402PayloadPlugin } from '@axlabs/ax402-payload'

/**
 * Example Payload config for local plugin development.
 * Run from a Payload website project with MongoDB configured.
 */
export default {
  collections: [
    {
      slug: 'posts',
      fields: [{ name: 'title', type: 'text', required: true }],
    },
    {
      slug: 'pages',
      fields: [{ name: 'title', type: 'text', required: true }],
    },
  ],
  plugins: [
    ax402PayloadPlugin({
      collections: ['posts', 'pages'],
    }),
  ],
} satisfies Partial<Config>
