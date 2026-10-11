# Portfolio

Statický web s fotografiemi a grafikou: [Astro](https://astro.build) + [Pages CMS](https://pagescms.org) + GitHub Pages.

- **Projekty** – každý projekt je skupina obrázků s hlavní fotkou (cover) a názvem.
- **Dva pohledy** – *Projekty* (karty) a *Všechny práce* (všechny obrázky v jedné mřížce).
- **Filtry** – Fotografie / Grafika a tagy, fungují v obou pohledech a dají se sdílet odkazem.
- **Lightbox** – zvětšení obrázku, šipky, swipe na mobilu.
- Obrázky se při buildu automaticky zmenšují a převádějí do WebP.

## Jednorázové nastavení

1. **GitHub Pages:** repo → *Settings* → *Pages* → *Source: GitHub Actions*.
   Na free plánu musí být repo veřejné.
2. **Pages CMS:** na [app.pagescms.org](https://app.pagescms.org) se přihlas přes GitHub,
   nainstaluj Pages CMS aplikaci na repo `portfolio` a otevři ho.
3. Web poběží na `https://hyvexxx.github.io/portfolio/`.

## Jak přidat projekt

1. V Pages CMS otevři **Projekty → Add an entry**.
2. Vyplň název, kategorii, datum a tagy.
3. **Hlavní fotka:** v prohlížeči médií vytvoř **novou složku pro projekt**
   (např. `svatba-anna-petr`), nahraj do ní fotky a jednu vyber jako cover.
4. **Galerie:** vyber všechny fotky projektu (jde jich vybrat víc najednou),
   pořadí změníš přetažením.
5. Ulož. GitHub Action web za 1–3 minuty přebuilduje a projekt se objeví.

Projekt jde schovat zaškrtnutím **Koncept**, nebo připíchnout nahoru přes **Zvýraznit**.
Jméno, nadpis úvodní stránky, krátké představení, výzvu v patičce, kontakty a portrét
upravíš v sekci **O mně**.

> Ukázkové projekty (obrázky s nápisem „UKÁZKA“) smaž, až přidáš vlastní:
> `src/content/projects/*.md` a složky `src/assets/projects/ukazka-*`.

## Doporučení k fotkám

- **Nenahrávej plné originály.** Repo je veřejné a soubory si kdokoli stáhne.
  Exportuj JPEG s delší stranou **2500–3000 px**, sRGB, kvalita ~85.
- **Odstraň GPS z EXIFu** (Lightroom: *Export → Metadata → Remove Location Info*).
  Web sám servíruje zmenšené kopie bez metadat, jenže originál v repu je má pořád.
- Fotky z iPhonu (HEIC) převeď na JPEG.
- Repo drž zhruba do **1 GB**, to je řádově stovky fotek. Kdyby rostlo víc, dají se
  obrázky později přesunout na Cloudflare R2 nebo Cloudinary.

## Další nápady

- **Vlastní doména** (.cz za pár set Kč ročně): v `astro.config.mjs` nastav `site` na doménu
  a smaž řádek `base`, pak ji přidej v *Settings → Pages → Custom domain*.
- **Analytika bez cookie lišty:** [GoatCounter](https://www.goatcounter.com) nebo
  Cloudflare Web Analytics, stačí jeden `<script>` v `src/layouts/Base.astro`.
- **Kontaktní formulář:** [Formspree](https://formspree.io) bez vlastního serveru.

## Lokální vývoj

Potřebuješ Node.js 22.12+.

```bash
npm install
npm run dev       # vývojový server na http://localhost:4321/portfolio/
npm run build     # produkční build do dist/
npm run preview   # náhled buildu
```

## Struktura

```
.pages.yml                      konfigurace Pages CMS (pole formulářů)
.github/workflows/deploy.yml    build + nasazení na GitHub Pages
src/content/projects/*.md       projekty (frontmatter + popis)
src/content/site/about.md       jméno, podtitul, kontakty, text O mně
src/assets/projects/<projekt>/  fotky a grafiky
src/lib/projects.ts             načítání a řazení projektů, tagy
src/lib/images.ts               převod cest z CMS na optimalizované obrázky
src/pages/                      index (projekty), prace (vše), projekty/[slug], o-mne
src/styles/global.css           barvy, typografie, layout
```
