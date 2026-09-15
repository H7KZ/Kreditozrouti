---
title: Zásady ochrany soukromí
section: Právní
order: 1
---

# Zásady ochrany soukromí

_Poslední aktualizace: 14. září 2026_

## Jaká data Kreditožrouti shromažďuje

Kreditožrouti nevyžaduje registraci ani přihlášení. Neshromažďuje, neukládá ani nezpracovává žádné osobní údaje o
studentech.

Aplikace získává data výhradně z veřejně přístupného katalogu předmětů InSIS - stejných stránek, které může kdykoli
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

Kreditožrouti používá **Umami Analytics** - vlastní open-source analytický nástroj. Je navržen tak, aby respektoval
soukromí:

| Vlastnost                  | Detail                                                                                                                                  |
| -------------------------- | --------------------------------------------------------------------------------------------------------------------------------------- |
| Cookies                    | Nepoužívají se                                                                                                                          |
| Kde běží                   | Na našem vlastním serveru, načítá se z adresy tohoto webu (`/stats`) - žádný analytický server třetí strany se nekontaktuje             |
| IP adresy                  | Slouží k odvození přibližné země a regionu a otisku návštěvníka, který se každý měsíc mění; samotná IP adresa se neukládá               |
| Sdílené odkazy             | Odkaz na sdílený rozvrh se zaznamená jako `/s/[id]` - identifikátor odkazu, název stránky i parametry adresy se před odesláním odstraní |
| Osobní identifikátory      | Neshromažďovány                                                                                                                         |
| Sdílení s třetími stranami | Žádné - data zůstávají na vlastním serveru                                                                                              |
| Doba uchování              | 13 měsíců, poté se automaticky mažou                                                                                                    |
| Právní základ (GDPR)       | Oprávněný zájem (čl. 6 odst. 1 písm. f) - anonymizovaná měření návštěvnosti                                                             |

Data sbíraná Umami: zobrazení stránek, délka sezení, odkaz příchodu a souhrnné interakce s funkcemi (např. „předmět byl
přidán do rozvrhu"). Tato data nemohou identifikovat žádného konkrétního uživatele.

Pokud se rozhodneš odpovědět na nepovinnou výzvu ke zpětné vazbě v aplikaci, palec nahoru/dolů, nepovinné hodnocení
sušenkami a jakýkoli nepovinný komentář, který napíšeš, se odešlou do téže vlastní instance Umami jako jedna událost
zpětné vazby. Pole komentáře je nepovinné a volné - prosím neuváděj do něj žádné osobní údaje.

| Vlastnost            | Detail                                                                                                                                                                                                                           |
| -------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Právní základ (GDPR) | Souhlas (čl. 6 odst. 1 písm. a) - událost se odešle pouze tehdy, když výzvu aktivně odešleš                                                                                                                                      |
| Doba uchování        | Volné komentáře se uchovávají nejdéle 12 měsíců, poté se mažou                                                                                                                                                                   |
| Výmaz                | Protože se s událostí neukládá žádný identifikátor, o výmaz konkrétního komentáře (GDPR čl. 17) požádej přes repozitář projektu s dostatkem kontextu, abychom jej dohledali; na požádání můžeme celý dataset zpětné vazby smazat |

## Hlášení chyb

Kreditožrouti používá **Grafana Faro** k hlášení pádů aplikace, abychom je mohli opravit. Je nastaven tak, aby
zachytával pouze:

| Vlastnost                  | Detail                                                                                                                                      |
| -------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------- |
| Co se zachytává            | Chyby JavaScriptu (zpráva + stack trace), metriky výkonu Web Vitals a adresa stránky bez identifikátorů sdílených odkazů a parametrů adresy |
| Sledování sezení           | Vypnuto - v prohlížeči se neukládá žádný trvalý ani pseudonymní identifikátor                                                               |
| Zachytávání konzole        | Vypnuto - výstup tvé konzole se nikdy neodesílá                                                                                             |
| Sledování chování          | Žádné - Faro nesleduje zobrazení stránek, kliknutí ani navigaci (to je doména Umami)                                                        |
| Cookies                    | Nepoužívají se                                                                                                                              |
| Sdílení s třetími stranami | Žádné - hlášení se odesílají na náš vlastní self-hosted collector, nikoli do Grafana Cloud                                                  |
| Doba uchování              | 7 dní, poté se automaticky mažou                                                                                                            |
| Právní základ (GDPR)       | Oprávněný zájem (čl. 6 odst. 1 písm. f) - stabilita a bezpečnost aplikace                                                                   |

Protože Faro neukládá žádný identifikátor ani nesleduje chování, nevyžaduje souhlas. Pokud na žádnou chybu nenarazíš,
neodešlou se žádná data.

## Provozní záznamy a infrastruktura

Naše servery uchovávají technické záznamy o požadavcích a chybách nejvýše 7 dní (záznamy přístupů 3 dny) kvůli řešení
problémů a bezpečnostních incidentů. IP adresy, parametry adres a identifikátory sdílených odkazů se před uložením
odstraňují.

Aplikace běží na serverech společnosti Hetzner Online GmbH v Německu (Evropská unie). Požadavky na web procházejí přes
**Cloudflare, Inc.**, který web chrání před útoky a doručuje ho; Cloudflare jako náš zpracovatel zpracovává každý
požadavek včetně tvé IP adresy a může tak činit i mimo Evropský hospodářský prostor. Předání se opírá o rámec EU-US Data
Privacy Framework, v němž je Cloudflare certifikován, a o standardní smluvní doložky v jeho smlouvě o zpracování údajů.

## Data uložená ve tvém prohlížeči

Vše, co si Kreditožrouti uchovává mezi návštěvami, je uloženo výhradně v `localStorage` tvého prohlížeče. Nikdy se
neposílá na naše servery a vymazáním dat prohlížeče je trvale odstraníš. Patří sem:

- Jakýkoli rozvrh, který sestavíš, spolu s uloženými rozvrhy a volbami průvodce
- Předvolby rozhraní (režim zobrazení, boční panel, legenda)
- Stav výzvy ke zpětné vazbě, který zahrnuje seznam jednotlivých kalendářních dnů, kdy jsi aplikaci navštívil/a. Tento
  seznam dnů nikdy neopustí tvůj prohlížeč; slouží pouze lokálně k rozhodnutí, zda vracejícímu se uživateli zobrazit
  nepovinnou výzvu ke zpětné vazbě, a odstraní se při vymazání dat prohlížeče.

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
