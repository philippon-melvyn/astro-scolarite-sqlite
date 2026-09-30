// auth.config.ts
import Google from '@auth/core/providers/google';
import { defineConfig } from 'auth-astro';

export default defineConfig({
  // Astro validates the public proxy domain in security.allowedDomains.
  trustHost: true,
  secret: process.env.AUTH_SECRET || import.meta.env.AUTH_SECRET,
  providers: [
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID || import.meta.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET || import.meta.env.GOOGLE_CLIENT_SECRET,

      authorization: {
        params: {
          prompt: 'select_account',
        },
      },
    }),
  ],

  callbacks: {
    async redirect({ url, baseUrl }) {
      return `${baseUrl}/`;
    },
  },
});
