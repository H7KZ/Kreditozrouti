---
title: MCP integrace
order: 3
---

# MCP integrace

Kreditožrouti nabízí server [Model Context Protocol](https://modelcontextprotocol.io) pro asistenty, kteří podporují vzdálené připojení MCP. Poskytuje údaje o předmětech a studijních plánech i nástroje pro rozvrh. Pracuje s databází aplikace, která může mít oproti InSISu zpoždění.

## Připojení

Přidej do asistenta vzdálený MCP server s touto adresou:

```text
https://kreditozrouti.cz/mcp
```

Pokud klient zobrazí výzvu k autorizaci, dokonči ji. Obrazovky a formáty konfigurace se liší; použij aktuální návod svého klienta pro vzdálený HTTP MCP server.

## Dostupné nástroje

| Nástroj | Použití |
| --- | --- |
| `vse_search_courses` | Vyhledá souhrny předmětů podle textu, fakulty, semestru nebo jazyka. |
| `vse_get_course` | Načte předmět včetně jednotek a rozvrhových akcí. |
| `vse_get_study_plan` | Načte studijní plán a seznam předmětů. |
| `vse_check_timetable_conflicts` | Zkontroluje časové kolize až 30 ID předmětů. |
| `vse_optimize_timetable` | Sestaví rozvrh nebo prozkoumá předměty, které se vejdou k základnímu výběru. |

Vyhledávání vrací souhrny. Před dotazem na konkrétní časy načti detail předmětu. Optimalizátor přijímá preferované dny, blokované časové úseky, meze ECTS a nejdelší souvislý blok výuky. Časy v argumentech jsou minuty od půlnoci: `08:00` je `480`.

## Zdroje a šablony

Klient může zpřístupnit také zdroje `vse://faculties`, `vse://study-plans`, `vse://study-plans/{faculty_id}` a `vse://course/{id}` pouze pro čtení. Šablony `build_schedule` a `explore_plan` provázejí běžnými postupy, pokud klient podporuje MCP prompts.

Příklad dotazu: „Najdi anglicky vyučované předměty na FIS pro zimní semestr a ukaž rozvrhové akce těch, které vyberu.“ Konečné údaje před zápisem ověř v InSISu.
