import { defineConfig } from "astro/config";
import sitemap from "@astrojs/sitemap";

export default defineConfig({
  site: "https://tempoapp.app",
  integrations: [
    sitemap({
      // The homepage is a static public/index.html, so Astro's sitemap
      // doesn't see it automatically; add it explicitly.
      customPages: ["https://tempoapp.app/"],
      // Tag pages are thin listing pages (noindex'd); keep them out of the sitemap.
      filter: (page) => !page.includes("/blog/tags/"),
    }),
  ],
  markdown: {
    shikiConfig: {
      theme: "github-dark-dimmed",
      wrap: true,
    },
  },
});
