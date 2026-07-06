---
title: Optimalizátor
description: Automatické generování bezkonfliktních kombinací rozvrhu.
---

# Optimalizátor

Záložka Optimalizátor (ikona jiskřiček v záhlaví) automaticky generuje kandidáty bezkonfliktního rozvrhu místo ručního
sestavování rozvrhu po předmětech. Ideální, když máš sadu předmětů, které potřebuješ, a chceš rychle najít nejlepší
uspořádání.

## Nastavení

### 1. Přidej předměty do koše

Zadej kód nebo název předmětu do vyhledávacího pole a kliknutím přidej. Předměty odstraníš tlačítkem ×. Koš obsahuje
předměty, které chceš, aby solver naplánoval.

### 2. Nastav omezení (vše volitelné)

| Omezení                         | Co dělá                                                                                                                     |
|---------------------------------|-----------------------------------------------------------------------------------------------------------------------------|
| **Min / max ECTS**              | Celkový kreditový rozsah vygenerovaného rozvrhu                                                                             |
| **Preferované dny**             | Přepni dny, ve které chceš mít výuku — solver upřednostňuje tyto dny, ale nezablokuje ostatní, pokud neexistuje alternativa |
| **Blokovaná okna**              | Označ časové rozsahy, kdy nejsi k dispozici (např. brigáda nebo pravidelný závazek)                                         |
| **Max. po sobě jdoucích hodin** | Omez, kolik hodin lze naplánovat za sebou                                                                                   |

### 3. Generuj

Klikni na **Generovat rozvrhy**. Omezení se automaticky ukládají a použijí se příště, když záložku otevřeš.

---

## Výsledky

Solver provede dva průchody:

**Všechny předměty naplánované** — až 5 seřazených kandidátů, kde se každý předmět z koše vejde bez konfliktů.

**Pokud vynecháš jeden předmět…** — jeden nejlepší kandidát na každý předmět z koše, ukazující, jak by rozvrh vypadal,
kdyby byl tento předmět odebrán. Zobrazí se pouze tehdy, když neexistuje úplný rozvrh.

---

## Čtení karty výsledků

Každá karta výsledku zobrazuje **mini mřížku rozvrhu**. Kliknutím na kartu otevřeš úplný náhled rozvrhu s týdenní
mřížkou.

V náhledu:

- **Nově přidané jednotky jsou zvýrazněny oranžově**, takže přesně vidíš, co by se změnilo oproti tvému aktuálnímu
  rozvrhu.
- **Rozpis skóre** zobrazuje penalizační body za: areálové konflikty, mezery v rozvrhu, dny mimo preferované a dlouhé
  bloky výuky za sebou. Nižší skóre = lepší rozvrh.

Klikni na **Použít tento rozvrh** v náhledu pro aplikaci kandidáta. Tvůj aktuální rozvrh bude nahrazen.
