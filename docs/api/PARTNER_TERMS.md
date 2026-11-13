# Partner terms (Studolog)

The terms a partner accepts in writing before it gets a `/v1` key (ADR 0004, gate 1). Written in Czech because both
parties are Czech; the accepted version is the one sent by email, and a change needs a new written acceptance.
Technical details are in [PUBLIC_API.md](PUBLIC_API.md).

---

# Podmínky partnerského přístupu k API Kreditožrouti

Verze 1, 13. 11. 2026

**Strany:** projekt Kreditožrouti (kreditozrouti.cz), provozovaný Janem Komínkem („my"), a Studolog s.r.o. („partner").

## 1. Co partner dostává

1. Přístup ke čtecímu API `https://kreditozrouti.cz/api/v1` s katalogem předmětů VŠE (předměty, rozvrhové akce,
   fakulty, období, studijní plány) a se jmény vyučujících. Popis je v `GET /v1/openapi.json`.
2. API klíče vydáváme my. Klíč pro server (bez origin) je tajný. Klíč pro prohlížeč je vázaný na registrované
   originy (`https://studolog.cz`, `https://studolog.com`), smí jen číst katalog a je ze své podstaty veřejný.
3. Limit je společný pro všechny klíče partnera: 500 požadavků za minutu a 150 000 za den (UTC). Limity můžeme po
   dohodě upravit.

## 2. Jak partner data používá

1. Data slouží jen produktu Studolog pro studenty VŠE: zobrazení předmětů, jejich hodnocení a souvisejících
   informací.
2. Partner data neprodává, nezpřístupňuje třetím stranám jako celek ani jako vlastní API či datovou sadu a
   nepoužívá je k jinému účelu.
3. Partner smí data ukládat do mezipaměti, ale obnovuje je nejméně jednou týdně, aby se odstraněné nebo opravené
   údaje projevily i u něj.
4. Kde partner data zobrazuje, uvede zdroj: „Data o předmětech: Kreditožrouti" s odkazem na kreditozrouti.cz.

## 3. Jména vyučujících (osobní údaje)

1. Jména vyučujících jsou osobní údaje. Partner je zobrazuje jen u předmětů, které vyučují, a nevytváří z nich
   profily ani je nespojuje s jinými údaji o těchto osobách.
2. Partner je pro své zpracování samostatným správcem a sám odpovídá za soulad s GDPR, včetně informování ve svých
   zásadách ochrany osobních údajů.
3. Když nás vyučující požádá o odstranění jména, dáme partnerovi vědět. Partner jméno odstraní do 7 dnů od
   oznámení, včetně mezipaměti.

## 4. Klíče a bezpečnost

1. Partner drží serverový klíč mimo kód frontendu a repozitáře.
2. Únik klíče nám partner oznámí bez zbytečného odkladu. Klíč zneplatníme a vydáme nový.
3. Klíč můžeme kdykoliv zneplatnit nebo přístup omezit, hlavně při porušení těchto podmínek, při zneužití nebo
   když VŠE odvolá souhlas se zpřístupněním dat.

## 5. Dostupnost a změny

1. API je bez záruky dostupnosti (SLA). Data pocházejí z veřejného katalogu InSIS a za jejich správnost
   neručíme my ani VŠE.
2. Nezpětné změny verze `v1` oznámíme nejméně 30 dní předem. Rozšíření (nová pole, nové endpointy) mohou přijít
   kdykoliv.

## 6. Druhý směr

Hodnocení ze Studologu zobrazujeme podle podmínek Studologu: klíč držíme na serveru, data čteme po jednotlivých
předmětech, hromadně je nestahujeme a uvádíme Studolog jako zdroj.

## 7. Platnost a ukončení

1. Podmínky platí od písemného souhlasu partnera (stačí odpověď e-mailem) do ukončení kteroukoliv stranou.
2. Kterákoliv strana může spolupráci ukončit kdykoliv oznámením druhé straně. Po ukončení partner data z API
   smaže do 30 dnů.
3. Změnu podmínek oznámíme e-mailem. Platí, až ji partner písemně přijme. Do té doby platí předchozí verze.
