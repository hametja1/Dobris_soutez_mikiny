# Soutěž o návrh střediskové mikiny

Webová aplikace pro interní soutěž Střediska prof. Oliče Dobříš: odevzdání návrhů, hlasování a výsledky.
Postavená na Next.js (App Router, TypeScript), databázi Postgres a úložišti Vercel Blob. Běží na Vercelu
v bezplatných tarifech.

## Co umí

- **Odevzdání návrhu** – jméno, oddíl, kontakt, volitelný popis a soubor (JPG, PNG, WEBP nebo PDF do 4 MB).
  Velké fotky z mobilu se před odesláním samy zmenší. Jeden autor (podle jména, bez ohledu na diakritiku
  a velikost písmen) smí odevzdat nejvýše 3 návrhy.
- **Hlasování** – galerie s návrhy pod čísly, bez jmen autorů, v náhodném pořadí pro každého hlasujícího.
  Každý dá 2 hlasy pro (i oba jednomu návrhu) a volitelně 1 hlas proti, ten jen spolu s oběma hlasy pro
  a jinému návrhu. Pravidla hlídá formulář i server.
- **Jeden hlas na zařízení** – po odeslání si prohlížeč uloží příznak do localStorage a cookie. Je to
  ochrana proti omylu, ne proti podvodu (jiný prohlížeč nebo anonymní okno = nový hlas). Soutěž stojí
  na důvěře.
- **Výsledky** – body = hlasy pro − hlasy proti. Při remíze na prvním místě web upozorní, že rozhodne
  středisková rada.
- **Správa (`/admin`)** – přihlášení heslem, přepínání fází, volitelné termíny, moderace (skrýt / vrátit /
  natrvalo smazat návrh i soubor), průběžné výsledky, export do CSV pro Excel, smazání testovacích hlasů
  a po soutěži smazání jmen a kontaktů autorů.

### Fáze soutěže

| Fáze | Co web dělá |
|---|---|
| Příprava | Jen pravidla, nic nelze odevzdat ani hlasovat. |
| Odevzdávání návrhů | Lze odevzdávat. Galerie ještě není vidět. |
| Hlasování | Odevzdávání je zavřené, galerie je veřejná, lze hlasovat. |
| Výsledky | Hlasování je zavřené, výsledky jsou veřejné. |

Termíny jsou nepovinné. Pokud je nastavíte, odevzdávání nebo hlasování se po termínu samo zavře a web
termín zobrazí. Fázi ale vždy přepínáte ručně.

## Nasazení na Vercel

1. **Kód na GitHub.** Vytvořte nový (klidně soukromý) repozitář a nahrajte do něj obsah této složky.
2. **Projekt na Vercelu.** Na vercel.com zvolte *Add New → Project*, vyberte repozitář. Vercel sám pozná
   Next.js, nic dalšího nenastavujte a dejte *Deploy*. První nasazení může skončit chybou na stránkách,
   protože ještě chybí databáze – to je v pořádku.
3. **Databáze.** V projektu otevřete záložku *Storage → Create Database* a vyberte **Neon** (Postgres).
   Propojte ji s projektem. Vercel sám nastaví proměnnou `DATABASE_URL`. Tabulky si aplikace vytvoří
   sama při prvním spuštění.
4. **Úložiště souborů.** Ve stejné záložce zvolte *Create → Blob*, propojte s projektem. Vercel nastaví
   `BLOB_READ_WRITE_TOKEN`. Pokud se při zakládání ptá na přístup, zvolte veřejný (*public*) – soubory
   mají náhodné, neuhodnutelné adresy a osobní údaje v nich nejsou.
5. **Heslo do správy.** *Settings → Environment Variables* → přidejte `ADMIN_PASSWORD` (alespoň 12 znaků,
   ideálně náhodná fráze, kterou nepoužíváte jinde).
6. **Znovu nasaďte.** *Deployments → … → Redeploy*, aby se nové proměnné načetly.
7. **Vyzkoušejte.** Otevřete `/admin`, přihlaste se, přepněte na *Odevzdávání*, nahrajte zkušební návrh,
   přepněte na *Hlasování* a zahlasujte. Pak testovací návrhy smažte, tlačítkem *Smazat všechny hlasy*
   vyčistěte hlasy a přepněte zpět na *Přípravu*, dokud soutěž nevyhlásíte.

Vlastní adresa (např. `soutez.vasedomena.cz`) jde přidat v *Settings → Domains*.

## Logo a písma

- Znak v hlavičce a logo v patičce jsou v `public/znak-strediska.png` a `public/logo-strediska.png`,
  ikona webu v `app/icon.png`. Barvy webu jsou převzaté ze znaku (proměnné na začátku `app/globals.css`).
- Web je připravený na písma Junáka – **SKAUT Bold** na nadpisy a **TheMix C5** na text. Jsou licencovaná
  pro členy, proto nejsou součástí projektu. Nahrajte je do `public/fonts/` jako `skaut-bold.woff2`,
  `themix-c5-semilight.woff2` a `themix-c5-bold.woff2` (soubory OTF/TTF jde převést na WOFF2 například
  nástrojem woff2_compress). Dokud tam nejsou, použije se podobné volné písmo Fira Sans.

## Úpravy

- **Oddíly, limit návrhů, texty v hlavičce:** `lib/config.ts`
- **Pravidla a úvodní text:** `app/page.tsx`
- **Vzhled (barvy, písmo):** `app/globals.css` – barvy jsou nahoře jako proměnné

## Lokální vývoj

Potřebujete Node.js 20+ a libovolnou databázi Postgres (lokální, v Dockeru nebo vývojovou větev v Neonu).

```bash
npm install
cp .env.example .env.local   # doplňte DATABASE_URL a ADMIN_PASSWORD
npm run dev
```

Bez `BLOB_READ_WRITE_TOKEN` se soubory ukládají do složky `.data/uploads`, takže Blob lokálně nepotřebujete.

Postgres v Dockeru například:

```bash
docker run -d --name mikiny-db -e POSTGRES_PASSWORD=heslo -e POSTGRES_DB=mikiny -p 5432:5432 postgres:16
# DATABASE_URL=postgres://postgres:heslo@localhost:5432/mikiny
```

## Struktura

```
app/
  page.tsx                 úvod a pravidla
  odevzdat/                formulář pro odevzdání (zmenšení fotek v prohlížeči)
  hlasovani/               galerie, výběr hlasů, serverová akce castVote
  vysledky/                veřejné výsledky
  admin/                   správa, přihlášení, akce, export CSV
  api/submissions/         příjem návrhů (validace, limit na autora, uložení)
  api/local-file/          servírování souborů při lokálním vývoji
components/                galerie s náhledem, výsledky, potvrzovací tlačítko
lib/
  config.ts                nastavení soutěže
  data.ts                  práce s návrhy, hlasy a výsledky (SQL)
  db.ts, schema.ts         připojení k Postgres a schéma tabulek
  storage.ts               Vercel Blob / lokální soubory
  auth.ts                  přihlášení správce
  settings.ts, time.ts     fáze, termíny, pražský čas
```

## Zabezpečení

- **Nahrané soubory:** typ se ověřuje podle obsahu souboru (ne podle přípony) a z obrázků i PDF se mažou
  metadata – poloha GPS z fotek, jméno autora, model telefonu, autor PDF. Galerie tak zůstává anonymní.
- **Správa:** heslo alespoň 12 znaků; po 5 špatných pokusech z jedné adresy (nebo 30 celkem) se přihlášení
  na 15 minut zablokuje. Přihlášení platí 14 dní, cookie je `httpOnly` a `SameSite=Strict`. Všechny akce
  správy ověřují přihlášení na serveru.
- **Otevřený formulář:** nejvýše 10 nahrání za hodinu z jedné adresy a 300 návrhů celkem
  (`lib/config.ts`). Ukládá se jen otisk IP adresy, ne adresa.
- **Export CSV:** buňky začínající `=`, `+`, `-` nebo `@` se zneškodní, aby je Excel nespustil jako vzorec.
- **Hlavičky:** Content-Security-Policy, zákaz vkládání do cizích stránek, `nosniff` (viz `next.config.ts`).
- **Databáze:** spojení přes TLS s ověřením certifikátu.
- **Hlasování** záměrně stojí na důvěře – omezení jedním zařízením je ochrana proti omylu, ne proti podvodu.

## Osobní údaje

Jména a kontakty autorů vidí jen správce (v administraci a v CSV). Veřejná galerie i výsledky ukazují jen
čísla návrhů. Hlasy se ukládají jen s náhodným ID zařízení, bez IP adresy či jiných údajů. Po předání výhry
smažte údaje tlačítkem *Smazat osobní údaje autorů*.
