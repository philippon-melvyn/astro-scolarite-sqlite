import { defineConfig } from "astro/config";
import node from "@astrojs/node";
import auth from "auth-astro";

export default defineConfig({
  site: "https://scolarite50.melvyn-philippon.fr",
  security: {
    allowedDomains: [{ protocol: "https", hostname: "scolarite50.melvyn-philippon.fr" }],
  },
  output:"server",

  adapter:node({
      mode:"standalone"
  }),

  integrations: [auth()]
});
