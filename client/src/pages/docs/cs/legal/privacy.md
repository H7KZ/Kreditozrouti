---
title: Zásady ochrany soukromí
section: Právní
order: 1
---

# Zásady ochrany soukromí

_Poslední aktualizace: 31. ledna 2026_

## Jaká data Kreditožrouti shromažďuje

Kreditožrouti nevyžaduje registraci ani přihlášení. Neshromažďuje, neukládá ani nezpracovává žádné osobní údaje o
studentech.

Aplikace získává data výhradně z veřejně přístupného katalogu předmětů InSIS — stejných stránek, které může kdykoli
procházet libovolný student bez přihlášení. Tato data tvoří:

- Metadata předmětů (název, identifikátor, kredity, sylabus)
- Rozvrhové sloty (den, čas, místnost)
- Jména vyučujících (jako atributy předmětů, zveřejněná VŠE dle SR 05/2018 čl. 19 odst. 2)
- Studijní plány (struktura a kategorie předmětů)
- Informace o fakultách

Žádné z těchto dat nepředstavuje osobní údaje ve smyslu GDPR v kontextu této aplikace.

## Co Kreditožrouti NESHROMAŽĎUJE

- Jména, e-mailové adresy ani ID čísla studentů
- Známky, stav zápisu ani akademické záznamy
- Přihlašovací údaje (neexistuje žádný login)
- Cookies

## Analytika

Kreditožrouti používá **Umami Analytics** — vlastní open-source analytický nástroj. Je navržen tak, aby respektoval
soukromí:

| Vlastnost                  | Detail                                                                           |
| -------------------------- | -------------------------------------------------------------------------------- |
| Cookies                    | Nepoužívají se                                                                   |
| IP adresy                  | Umami je sbírá, ale před uložením hashuje — nikdy se neukládají v čitelné podobě |
| Osobní identifikátory      | Neshromažďovány                                                                  |
| Sdílení s třetími stranami | Žádné — data zůstávají na vlastním serveru                                       |
| Právní základ (GDPR)       | Oprávněný zájem (čl. 6 odst. 1 písm. f) — anonymizovaná měření návštěvnosti      |

Data sbíraná Umami: zobrazení stránek, délka sezení, odkaz příchodu a souhrnné interakce s funkcemi (např. „předmět byl
přidán do rozvrhu"). Tato data nemohou identifikovat žádného konkrétního uživatele.

Pokud se rozhodneš odpovědět na nepovinnou výzvu ke zpětné vazbě v aplikaci, palec nahoru/dolů, nepovinné hodnocení
sušenkami a jakýkoli nepovinný komentář, který napíšeš, se odešlou do téže vlastní instance Umami jako jedna událost
zpětné vazby. Pole komentáře je nepovinné a volné - prosím neuváděj do něj žádné osobní údaje.

## Hlášení chyb

Kreditožrouti používá **Grafana Faro** k hlášení pádů aplikace, abychom je mohli opravit. Je nastaven tak, aby
zachytával pouze:

| Vlastnost                  | Detail                                                                                       |
| -------------------------- | -------------------------------------------------------------------------------------------- |
| Co se zachytává            | Chyby JavaScriptu (zpráva + stack trace) a metriky výkonu Web Vitals                          |
| Sledování sezení           | Vypnuto — v prohlížeči se neukládá žádný trvalý ani pseudonymní identifikátor                 |
| Zachytávání konzole        | Vypnuto — výstup tvé konzole se nikdy neodesílá                                               |
| Sledování chování          | Žádné — Faro nesleduje zobrazení stránek, kliknutí ani navigaci (to je doména Umami)          |
| Cookies                    | Nepoužívají se                                                                                |
| Sdílení s třetími stranami | Žádné — hlášení se odesílají na náš vlastní self-hosted collector, nikoli do Grafana Cloud    |
| Právní základ (GDPR)       | Oprávněný zájem (čl. 6 odst. 1 písm. f) — stabilita a bezpečnost aplikace                     |

Protože Faro neukládá žádný identifikátor ani nesleduje chování, nevyžaduje souhlas. Pokud na žádnou chybu nenarazíš,
neodešlou se žádná data.

## Tvá data rozvrhu

Jakýkoli rozvrh, který sestavíš, je uložen výhradně v `localStorage` tvého prohlížeče. Nikdy se neposílá na naše
servery. Vymazáním dat prohlížeče jej trvale odstraníš.

## Jména vyučujících

Jména vyučujících se zobrazují výhradně jako atributy záznamů předmětů, v rozsahu výslovně povoleném VŠE Směrnicí
rektora 05/2018 čl. 19 odst. 2 písm. n (výuková činnost na VŠE). Žádné další osobní informace o vyučujících se
neshromažďují ani nezobrazují.

## Bezpečnost

- HTTPS je vynuceno na všech spojeních (Traefik / Let's Encrypt)
- Žádné přihlašovací údaje uživatelů se neukládají (neexistuje žádný systém účtů)
- Aplikace nezapisuje žádná data zpět do InSISu

## Kontakt

Kreditožrouti je studentský projekt, nikoli oficiální aplikace VŠE. Pro dotazy k těmto zásadám otevři issue v repozitáři
projektu nebo použij formulář zpětné vazby v aplikaci.
