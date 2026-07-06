---
title: Rozvrh
description: Sestavení a správa týdenního rozvrhu.
---

# Rozvrh

## Pohledy

Přepínání mezi třemi způsoby zobrazení předmětů pomocí záložek v záhlaví:

| Pohled | Co vidíš |
|---|---|
| **Seznam předmětů** | Seřaditelná tabulka — kód, název, fakulta, ECTS, způsob zakončení, přehled rozvrhu |
| **Můj rozvrh** | Týdenní mřížka pondělí–pátek, 07:30–20:00 — vybrané předměty jako barevné bloky |
| **Optimalizátor** | Generátor rozvrhů na základě koše — vyber předměty, nastav omezení, získej seřazené rozvrhy |

Předvolby Seznamu předmětů a Mého rozvrhu se ukládají mezi relacemi. Omezení Optimalizátoru se také ukládají a použijí se příště, když záložku otevřeš.

---

## Sestavení rozvrhu

1. Kliknutím na libovolný řádek předmětu jej rozbal.
2. Rozbalený řádek zobrazuje metadata předmětu (fakulta, ECTS, jazyk, kategorie), čipy předpokladů a sbalitelnou sekci **Sylabus** s cíli, výsledky učení, obsahem kurzu a literaturou. Pokud je jazyk rozhraní nastaven na angličtinu a anglický obsah je dostupný, zobrazí se anglická verze.
3. Pod sylabem: všechny dostupné **typy výukových jednotek** (přednáška, cvičení, seminář) a jejich časové sloty.
4. Kliknutím na slot jej přidáš do svého rozvrhu. Pokud už máš vybranou jednotku stejného typu pro tento předmět, automaticky se vymění.
5. Opakuj pro každý typ jednotky, který předmět vyžaduje. Některé předměty mají pouze přednášky, jiné vyžadují přednášku i cvičení.

Tvůj rozvrh se ukládá v lokálním úložišti prohlížeče — přežije obnovení stránky, zavření záložky i restart prohlížeče. Panel na pravé straně zobrazuje všechny vybrané jednotky seskupené podle předmětu s celkovým počtem ECTS kreditů.

### Kliknutí na blok v mřížce rozvrhu

Kliknutí na barevný blok v mřížce rozvrhu otevře panel s detailem předmětu z pravého okraje. Panel zobrazuje den, čas, místnost a vyučujícího pro daný slot, pak načte úplný detail předmětu níže. Z panelu můžeš:

- **Hledat v tomto časovém slotu** — přepne do pohledu Seznam předmětů předfiltrovaného na předměty dostupné v daném časovém okně
- **Odebrat z rozvrhu** — odstraní všechny sloty tohoto předmětu najednou
- **Otevřít v InSISu** — externí odkaz v názvu předmětu

---

## Detekce konfliktů

Každý předmět, který přidáš do rozvrhu, dostane stav. Stavový řádek v horní části stránky počítá každou kategorii — kliknutím na kategorii filtruj seznam předmětů pouze na tyto předměty.

| Stav | Barva | Význam |
|---|---|---|
| **Vybrán** | Modrá | Všechny požadované typy jednotek zvoleny, žádné časové ani areálové konflikty |
| **Neúplný** | Oranžová | Vybral/a jsi alespoň jeden typ jednotky, ale ne všechny požadované — např. přidal/a přednášku, ale ještě ne cvičení |
| **Areálový konflikt** | Oranžová | Žádné časové překrytí, ale přestávka mezi výukou na různých kampusech VŠE je kratší než 40 minut — nestačí na přejezd mezi Žižkovem a Jižním Městem |
| **Konflikt** | Červená | Dva vybrané předměty se překrývají časem ve stejný den |

### Detail areálového konfliktu

VŠE má dva hlavní kampusy:

- **Žižkov** — místnosti začínající na RB, NB, IB nebo SB
- **Jižní Město** — místnosti začínající na JM

Pokud vybereme předmět na jednom kampusu a další předmět na druhém kampusu s méně než 40 minutami mezi nimi, aplikace označí areálový konflikt. Pokud nelze určit kampus místnosti, areálový konflikt se nevyvolá.

---

## Tažení k filtrování

Dostupné v pohledu **Můj rozvrh**.

1. Klikni a táhni přes libovolnou prázdnou oblast mřížky a vyber časový rozsah.
2. Zobrazí se popover s vybraným dnem a časem.
3. Klikni na **Hledat předměty** pro potvrzení.
4. Aplikace přepne do pohledu Seznam předmětů a filtruje na předměty, které mají slot v daném časovém okně.

Toto je nejrychlejší způsob, jak zjistit: „Co je k dispozici v úterý dopoledne mezi 9 a 11?"

Odstranění časového filtru: otevři sekci **Časové omezení** v postranním panelu filtrů a odstraň záznam, nebo klikni na **Vymazat vše**.

---

## Uložené rozvrhy

Porovnej až 5 různých alternativ rozvrhu bez ztráty práce. K výběru rozvrhu se dostaneš z pohledu **Můj rozvrh**.

| Akce | Co dělá |
|---|---|
| **Uložit aktuální** | Uloží snímek tvého aktuálního rozvrhu s názvem, který zvolíš |
| **Duplikovat** | Zkopíruje existující snímek, abys z něj mohl/a experimentovat |
| **Přepnout** | Načte uložený snímek jako pracovní rozvrh |
| **Smazat** | Odstraní uložený snímek |

Použij to pro sestavení „Plán A: vše dopoledne" a „Plán B: pouze úterý/čtvrtek" vedle sebe a jejich porovnání.

---

## Sdílení rozvrhu

Sdílej svůj aktuální rozvrh s kýmkoli prostřednictvím krátkého odkazu.

1. Sestav svůj rozvrh jako obvykle.
2. Klikni na tlačítko **Sdílet** (ikona sdílení) v panelu nástrojů rozvrhu.
3. Odkaz se automaticky zkopíruje do schránky (např. `https://kreditozrouti.cz/s/abc123`).

**Co příjemce uvidí:**

- Rozvrh jen pro čtení zobrazující všechny tvé vybrané předměty
- Počet předmětů a celkovou kreditovou zátěž ECTS
- Tlačítko **Kopírovat odkaz** pro další sdílení URL
- Tlačítko **Uložit do mého rozvrhu** pro rozvětvení snímku do jednoho z vlastních slotů pro rozvrhy pro úpravy

Platnost odkazů vyprší po **180 dnech neaktivity** (vypršení se resetuje při každém zobrazení). Snímek je soběstačný, takže odkazy přežijí reset databáze.

---

## Export do kalendáře (iCal)

Použij tlačítko exportu kalendáře v panelu nástrojů rozvrhu ke stažení souboru `.ics` tvého vybraného rozvrhu. Importuj jej do Google Calendar, Apple Calendar nebo Outlooku — každý slot předmětu se stane týdenně se opakující událostí na semestr.

---

## Obnovení dat z InSISu

Data předmětů jsou pravidelně scrapována z InSISu. Pro nejaktuálnější informace o konkrétním předmětu:

1. Rozbal řádek předmětu.
2. Klikni na **ikonu obnovení** (kruhová šipka) vedle názvu předmětu.
3. Aplikace načte živá data z InSISu a aktualizuje předmět na místě — sloty, vyučující, přiřazení místností, kapacitu a všechny ostatní detaily.

**Omezení frekvence:** jednou za 10 minut na předmět. Odpočítávání se zobrazí, pokud se pokusíš obnovit příliš brzy.

---

## Informace o předpokladech

Pokud sylabus předmětu v InSISu uvádí předpoklady, rozbalený řádek předmětu je zobrazuje jako klikatelné čipy seskupené podle typu:

| Označení | Význam | Klikatelné? |
|---|---|---|
| **Požadované předpoklady** | Předměty, které musíš mít splněné před zápisem | Ano |
| **Nelze studovat po** | Předměty, po jejichž splnění se již nemůžeš zapsat do tohoto předmětu | Ano |
| **Nelze studovat spolu** | Předměty, které nelze absolvovat ve stejném semestru | Ne |
| **Doporučeno před** | Předměty doporučené jako předchozí studium (z doporučených programů) | Ano |

Kliknutím na čip se nastaví kód předmětu jako aktivní filtr **Vyhledávání** — užitečné pro rychlé ověření, zda je předpoklad v tomto semestru nabízen.

**Efekt filtru:** když aktivuješ filtrování **Splněných předmětů** (krok 4 průvodce nebo přepínač v postranním panelu filtrů):

- Předměty, u nichž jsi ještě nesplnil/a všechny **Požadované předpoklady**, se automaticky skryjí.
- Předměty, které spadají pod **Nelze studovat po** pro jakýkoli z tvých splněných předmětů, se také skryjí.

---

## Označit jako splněný

Předměty, které jsi již složil/a, lze skrýt ze seznamu, aby neobtěžovaly.

**Z aplikace (kdykoli):**

1. Rozbal řádek předmětu.
2. Klikni na **Označit jako splněný** v dolní části rozbaleného řádku.
3. Předmět se skryje ze seznamu (pokud nezapneš „Zobrazit splněné předměty" v postranním panelu filtrů).

**Z průvodce:** Krok 4 průvodce umožňuje hromadné označení splněných předmětů před zahájením procházení.

Zrušení označení: rozbal předmět (viditelný při zapnutém „Zobrazit splněné předměty") a klikni znovu na **Označit jako splněný** pro přepnutí zpět.
