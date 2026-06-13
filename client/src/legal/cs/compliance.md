# Kreditožrouti — Soulad s předpisy a podmínky užívání

_Ověření souladu s interními předpisy VŠE_

| Pole               | Hodnota                                          |
| ------------------ | ------------------------------------------------ |
| Verze dokumentu    | v1.0.0 — Beta verze                              |
| Datum              | 31. ledna 2026                                   |
| Aplikace           | Webová aplikace Kreditožrouti                    |
| Posouzené předpisy | SR 05/2018, PR 04/2019, PR 02/2023, Studijní řád |
| Cílová skupina     | Studenti, vyučující, zaměstnanci VŠE             |

## 1. Shrnutí

Možná se ptáte: je Kreditožrouti povolený? Porušuje nějaká univerzitní pravidla? Jsou moje data v bezpečí? Tento
dokument odpovídá na tyto otázky tím, že mapuje každý příslušný předpis VŠE na skutečnou implementaci aplikace. Stručná
odpověď: ano, je plně v souladu. Níže najdete podrobný rozbor.

**Přehled souladu**

- SR 05/2018 (Ochrana osobních údajů): **V SOULADU** — Osobní údaje nejsou zpracovávány
- PR 02/2023 (Pravidla IS): **V SOULADU** — Přístup pouze pro čtení k veřejným datům, scrapování schváleno řídicím
  výborem InSIS
- PR 04/2019 (Pravidla webhostingu): **NEAPLIKOVATELNÉ** — Vlastní infrastruktura
- Studijní a zkušební řád: **V SOULADU** — Podporuje vyhledávání předmětů studenty

## 2. Přehled aplikace

Kreditožrouti je webová aplikace, která pomáhá studentům VŠE vyhledávat předměty, plánovat rozvrhy a detekovat časové
konflikty. Stahuje data z veřejně přístupného katalogu předmětů InSIS (bez nutnosti přihlášení), normalizuje je a
prezentuje prostřednictvím moderního rozhraní s pokročilým filtrováním.

### 2.1 Datové zdroje a rozsah

| Kategorie dat                                      | Zdroj                 | Osobní údaje?            |
| -------------------------------------------------- | --------------------- | ------------------------ |
| Metadata předmětů (název, ident, kredity, sylabus) | Veřejný katalog InSIS | Ne                       |
| Rozvrhové sloty (den, čas, místnost)               | Veřejný katalog InSIS | Ne                       |
| Jména vyučujících (atribut předmětu)               | Veřejný katalog InSIS | Omezené — viz §2.2       |
| Studijní plány (struktura, kategorie)              | Veřejný katalog InSIS | Ne                       |
| Informace o fakultách                              | Veřejný katalog InSIS | Ne                       |
| Osobní údaje studentů                              | NESHROMAŽĎOVÁNO       | N/A — Nikdy přistupováno |
| Známky / zápisy studentů                           | NESHROMAŽĎOVÁNO       | N/A — Nikdy přistupováno |
| Přihlašovací údaje                                 | NESHROMAŽĎOVÁNO       | N/A — Žádný login        |

### 2.2 Jména vyučujících — klasifikace

Jména vyučujících se objevují jako atributy záznamů předmětů ve veřejně přístupném katalogu InSIS. Podle SR 05/2018 čl.
19 odst. 2 VŠE umožňuje zveřejňování jmen, titulů, pozice a výukové činnosti zaměstnanců (písm. a–c, e, n).
Kreditožrouti zobrazuje jména vyučujících výhradně v kontextu výukové činnosti, což spadá do tohoto povoleného rozsahu.
Žádné další osobní informace (kontakty, fotografie, vědecké výstupy) se nestahují ani nezobrazují.

## 3. SR 05/2018 — Ochrana osobních údajů

Směrnice rektora 05/2018 (Ochrana a zpracování osobních údajů) implementuje požadavky GDPR v rámci VŠE. Tato sekce
mapuje každý relevantní článek na implementaci Kreditožrouti.

| Článek    | Požadavek                                                            | Stav | Implementace                                                                                                                                                              |
| --------- | -------------------------------------------------------------------- | ---- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Čl. 1(2)  | Působnost: zpracování zaměstnanci/studenty při plnění úkolů          | ✅   | Kreditožrouti zpracovává pouze veřejně dostupná data katalogu předmětů. Osobní údaje studentů ani zaměstnanců nejsou sbírány, ukládány ani zpracovávány.                  |
| Čl. 13    | Registrace zpracování u Pověřence (DPO)                              | N/A  | Žádná činnost zpracování osobních údajů neexistuje. Aplikace zpracovává veřejně dostupná institucionální data (metadata předmětů), nikoli osobní údaje dle GDPR čl. 4(1). |
| Čl. 14(1) | Vyžadován právní základ zpracování                                   | ✅   | Primární data (předměty, rozvrhy, plány) jsou institucionální, nikoli osobní. Jména vyučujících jsou zveřejněna dle čl. 19(2)(n).                                         |
| Čl. 16    | Zvláštní kategorie (biometrie, zdraví) vyžadují výslovný souhlas     | N/A  | Žádná data zvláštní kategorie nejsou sbírána. Aplikace nemá uživatelské účty ani biometrická či zdravotní data.                                                           |
| Čl. 17    | Transparentní informování subjektů údajů                             | ✅   | Vyučující jsou zobrazeni pouze v kontextu svých veřejně uvedených výukových činností. Na aplikaci je zobrazeno prohlášení.                                                |
| Čl. 19(2) | Zveřejnitelné údaje: jméno, tituly, pozice, výuka                    | ✅   | Zobrazeno je pouze jméno vyučujícího jako atribut předmětu, což je výslovně v povoleném rozsahu (písm. n: výuková činnost na VŠE).                                        |
| Čl. 20    | Sdílení dat třetím stranám vyžaduje oznámení DPO                     | N/A  | Kreditožrouti nesdílí žádná data s třetími stranami. Žádná analytika, sledování ani externí API nepřenáší data ven.                                                       |
| Čl. 21    | Bezpečnostní opatření: šifrování, řízení přístupu, hlášení incidentů | ✅   | HTTPS přes Traefik/Let's Encrypt. Tajemství v env proměnných. Parametrizované dotazy. Bearer token autentizace pro admin endpointy. Grafana Faro monitoring.              |

## 4. PR 02/2023 — Pravidla IS

Pravidla provozování a využívání informačních systémů (PR 02/2023) upravují vytváření, provoz a užívání informačních
systémů na VŠE.

### 4.1 Klasifikace: Je Kreditožrouti IS VŠE?

**Klíčové určení:** Kreditožrouti **NENÍ** informačním systémem VŠE dle PR 02/2023 čl. 3. Jedná se o nezávislý, externě
hostovaný, studentský projekt, který pracuje s veřejně dostupnými daty. Není provozován žádnou organizační jednotkou
VŠE, není registrován v registru IS VŠE a nezpracovává data v infrastruktuře VŠE. Některá ustanovení jsou nicméně
relevantní, protože aplikace pracuje s daty InSIS. Ta jsou analyzována níže.

### 4.2 Relevantní ustanovení

| Článek      | Požadavek                                                     | Stav         | Pozice Kreditožrouti                                                                                                                                                 |
| ----------- | ------------------------------------------------------------- | ------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Čl. 3(5)    | VŠE vede registr svých IS, spravovaný Manažerem KB            | N/A          | Kreditožrouti není IS VŠE a nepodléhá proto registraci. Jedná se o studentský projekt na externí infrastruktuře.                                                     |
| Čl. 8(2)    | Uživatelé musí nakládat s daty IS v souladu s jejich účelem   | ✅           | Veškerá data z InSIS se používají výhradně pro vyhledávání předmětů a plánování rozvrhů — tedy pro tentýž účel, pro který jsou veřejně dostupná v InSIS.             |
| Čl. 9A.8(1) | Uživatelé nesmí svévolně měnit, vkládat či mazat data v InSIS | ✅           | Kreditožrouti provádí operace POUZE PRO ČTENÍ na veřejně přístupných stránkách InSIS. Do InSIS se nic nezapisuje.                                                    |
| Čl. 9A.8(2) | Automatizované provádění funkcí InSIS vyžaduje schválení      | ✅ Schváleno | Řídicí výbor InSIS posoudil a schválil tento případ použití. Scraper pracuje jen pro čtení s rate limitingem, deduplikací a plánovanými běhy mimo špičku (1–2 hod.). |

### 4.3 Schválení řídicím výborem InSIS

Řídicí výbor InSIS — administrátoři odpovědní za informační systém InSIS — posoudili rozsah scrapování, frekvenci,
opatření pro omezení zátěže a využití dat a udělili schválení pro tento projektový případ použití.

Toto schválení pokrývá scrapování veřejně přístupného katalogu předmětů InSIS pouze pro čtení, za účelem vyhledávání
předmětů a plánování rozvrhů studenty VŠE.

## 5. PR 04/2019 — Pravidla webhostingu

Pravidla používání serveru webhosting.vse.cz (PR 04/2019) upravují webové stránky hostované na serveru webhosting.vse.cz
VŠE.

**Posouzení aplikovatelnosti: NEAPLIKOVATELNÉ.** Kreditožrouti NENÍ hostován na webhosting.vse.cz. Je nasazen na
nezávislé infrastruktuře pomocí Docker kontejnerů s Traefik reverse proxy a vlastní doménou. Pokud by však projekt v
budoucnu migroval na infrastrukturu VŠE, platila by následující ustanovení:

### 5.1 Připravenost na budoucí soulad s webhostingem

| Článek | Požadavek                                                                  | Připravenost  | Současný stav                                                                                            |
| ------ | -------------------------------------------------------------------------- | ------------- | -------------------------------------------------------------------------------------------------------- |
| Čl. 3  | Doménová jména nesmí porušovat dobré mravy ani se vydávat za jiné jednotky | ✅            | "Kreditožrouti" je hravý studentský název. Nevydává se za žádnou jednotku VŠE a nemá komerční charakter. |
| Čl. 4  | Domény vyžadují elektronické schválení rektora/děkana                      | ✅ Připraveno | V případě migrace na subdoménu vse.cz bude formální schvalovací proces dodržen.                          |
| Čl. 8  | Oficiální stránky musí používat jednotnou vizuální identitu VŠE            | ✅ Připraveno | Kreditožrouti již kopíruje vizuální jazyk InSIS. Přizpůsobení oficiálním guidelinům by bylo přímočaré.   |
| Čl. 11 | Neoficiální stránky musí zobrazit prohlášení                               | ✅            | Aplikace zobrazuje viditelné prohlášení, že se nejedná o oficiální aplikaci VŠE.                         |
| Čl. 16 | HTTPS je povinné                                                           | ✅            | HTTPS vynuceno přes Traefik s automatickými Let's Encrypt certifikáty. HTTP přesměrováno na HTTPS.       |

## 6. Kontext studijního a zkušebního řádu

Studijní a zkušební řád VŠE stanovuje rámec pro registraci předmětů, studijní plány a rozvrhy. Kreditožrouti podporuje (
ale nenahrazuje) oficiální procesy definované těmito pravidly.

| Článek | Studijní pravidlo                                              | Podpora Kreditožrouti                                                                                                                                     |
| ------ | -------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Čl. 9  | Registrace předmětů probíhá přes InSIS v definovaných obdobích | Kreditožrouti je PLÁNOVACÍ nástroj. Studenti si zde sestaví návrh rozvrhu a pak se oficiálně registrují v InSIS. Toto rozlišení je jasně komunikováno.    |
| Čl. 14 | Studijní plány předepisují povinné předměty na semestr         | Průvodce studijním plánem kategorizuje předměty jako povinné, volitelné nebo volitelně volitelné dle zvoleného plánu.                                     |
| Čl. 13 | Kreditní systém: studenti musí dodržovat kreditní prahy        | Kreditové hodnoty předmětů jsou výrazně zobrazeny. Kontrola úplnosti ověřuje výběr výukových jednotek.                                                    |
| Čl. 10 | Hodnocení/klasifikace se zaznamenává v InSIS                   | Kreditožrouti NEPŘISTUPUJE k žádným datům o hodnocení či klasifikaci, nezobrazuje je ani nezpracovává. Jedná se čistě o nástroj pro vyhledávání předmětů. |
| Čl. 8  | Změny akreditace musí být zveřejněny před registračním obdobím | Kreditožrouti stahuje data během přípravných registračních období, aby data odpovídala aktuální nabídce semestru.                                         |
