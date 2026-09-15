---
title: MCP integrace
order: 3
---

# MCP integrace

Kreditožrouti poskytuje server [MCP (Model Context Protocol)](https://modelcontextprotocol.io), který umožňuje AI
asistentům - Claude Desktop, Cursor, VS Code Copilot a dalším - dotazovat se na živá data předmětů VŠE, kontrolovat
konflikty v rozvrhu a optimalizovat rozvrhy za tebe.

Veřejný endpoint je:

```
https://kreditozrouti.cz/mcp
```

## Co může AI dělat

Po připojení má tvůj AI asistent přístup k následujícím nástrojům:

| Nástroj                         | Co dělá                                                                                                                                                                             |
| ------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `vse_search_courses`            | Vyhledá předměty podle klíčového slova, fakulty, semestru nebo jazyka výuky. Vrací souhrnná data - pro úplné detaily slotů použij `vse_get_course` nebo přečti `vse://course/{id}`. |
| `vse_get_course`                | Načte jeden předmět se všemi jeho rozvrhový sloty                                                                                                                                   |
| `vse_get_study_plan`            | Načte studijní plán s úplným seznamem předmětů                                                                                                                                      |
| `vse_check_timetable_conflicts` | Zkontroluje, zda má sada předmětů nějaké časové překryvy                                                                                                                            |
| `vse_optimize_timetable`        | Najde bezkonfliktní rozvrh pro danou sadu předmětů                                                                                                                                  |

**Příklady dotazů, které můžeš Claude zadat po připojení:**

- „Najdi všechny předměty vyučované anglicky na FIS pro zimní semestr."
- „Kolidují tyto tři předměty navzájem? ID: 1042, 1187, 2034."
- „Sestav mi bezkonfliktní rozvrh z mého studijního plánu s volnými pátky."
- „Které další předměty z FPH se ještě vejdou do mého aktuálního rozvrhu?"

## Zdroje (Resources)

Zdroje jsou datové endpointy pouze pro čtení, které může hostitel (Claude Desktop, Cursor, VS Code) vložit přímo do
kontextu. Na rozdíl od nástrojů je nemusíte volat jako akce - klient je může načíst předem.

| URI                              | Popis                                                                                  |
| -------------------------------- | -------------------------------------------------------------------------------------- |
| `vse://faculties`                | Všechny fakulty VŠE s jejich ID. Přečtěte jako první, abyste získali platná ID fakult. |
| `vse://study-plans`              | Všechny studijní plány napříč všemi fakultami.                                         |
| `vse://study-plans/{faculty_id}` | Studijní plány jedné fakulty - nahraďte `{faculty_id}` např. `FIS`.                    |
| `vse://course/{id}`              | Kompletní detail kurzu včetně časových slotů - nahraďte `{id}` číselným ID kurzu.      |

## Šablony (Prompts)

Šablony jsou pracovní postupy, které můžete spustit přímo ze svého AI klienta (v Claude Desktop a Cursor se zobrazují
jako lomítkové příkazy).

| Název            | Argumenty                                         | Co dělá                                                                                 |
| ---------------- | ------------------------------------------------- | --------------------------------------------------------------------------------------- |
| `build_schedule` | `semester` (ZS nebo LS), `faculty_id` (volitelné) | Provede vás výběrem předmětů, kontrolou kolizí a optimalizací rozvrhu pro daný semestr. |
| `explore_plan`   | `faculty_id`                                      | Projde studijní plány fakulty a shrne jejich předměty.                                  |

## Připojení Claude Desktop

Claude Desktop podporuje vzdálené MCP servery přes SSE. Přidej následující záznam do konfiguračního souboru Claude
Desktop:

**macOS:** `~/Library/Application Support/Claude/claude_desktop_config.json`

**Windows:** `%APPDATA%\Claude\claude_desktop_config.json`

```json
{
	"mcpServers": {
		"kreditozrouti": {
			"url": "https://kreditozrouti.cz/mcp"
		}
	}
}
```

Ulož soubor a restartuj Claude Desktop. V seznamu připojených nástrojů by se měl zobrazit „kreditozrouti".

## Připojení Cursor

Přidej do `.cursor/mcp.json` v kořenovém adresáři projektu (nebo globálně `~/.cursor/mcp.json`):

```json
{
	"mcpServers": {
		"kreditozrouti": {
			"url": "https://kreditozrouti.cz/mcp"
		}
	}
}
```

## Připojení VS Code

Přidej do `.vscode/mcp.json` ve svém pracovním prostoru:

```json
{
	"servers": {
		"kreditozrouti": {
			"type": "http",
			"url": "https://kreditozrouti.cz/mcp"
		}
	}
}
```

## Referenční příručka nástrojů

### `vse_search_courses`

Vyhledávání předmětů pomocí libovolné kombinace filtrů:

| Parametr     | Typ                | Popis                                                     |
| ------------ | ------------------ | --------------------------------------------------------- |
| `query`      | string (volitelné) | Fulltextové vyhledávání v názvu předmětu a identifikátoru |
| `faculty_id` | string (volitelné) | Kód fakulty, např. `"FIS"`, `"FPH"`, `"FMV"`              |
| `semester`   | string (volitelné) | `"ZS"` (zimní), `"LS"` (letní), nebo `"Both"`             |
| `language`   | string (volitelné) | Jazyk výuky, např. `"EN"`, `"CS"`                         |
| `limit`      | number (1–100)     | Výsledků na stránku - výchozí 20                          |
| `offset`     | number             | Stránkovací posun - výchozí 0                             |

Vrací `{ courses, total }`.

### `vse_check_timetable_conflicts`

Předej pole ID předmětů (až 30). Vrátí `{ has_conflicts: boolean, conflicts: [...] }` - každý záznam konfliktu uvádí dva
překrývající se předměty, den a časový rozsah.

### `vse_optimize_timetable`

Dva režimy:

- **`build`** - pro danou pevnou sadu předmětů najde nejlepší bezkonfliktní kombinaci sekcí přednášek/cvičení. Použij,
  když jsi již rozhodl/a, které předměty chceš.
- **`explore`** - začne od základní sady předmětů a zkouší přidat každý předmět z dalšího seznamu. Použij, když chceš
  vědět, které další předměty se ještě vejdou.

Volitelná omezení:

```json
{
	"blackout_windows": [{ "day": "friday", "time_from": 0, "time_to": 1439 }],
	"preferred_days": ["monday", "tuesday", "wednesday"],
	"credit_min": 18,
	"credit_max": 30,
	"max_consecutive_minutes": 180
}
```

Všechny časy jsou v **minutách od půlnoci**: `08:00` = `480`, `14:30` = `870`.

## Tipy pro nejlepší výsledky

1. **Začni s fakultami.** Požádej AI, aby nejprve přečetla `vse://faculties`, aby měla platná ID fakult před
   filtrováním.
2. **Vyhledej, pak načti.** `vse_search_courses` vrací souhrny; požaduj konkrétní ID předmětu pouze tehdy, když
   potřebuješ úplné detaily slotů.
3. **Zkontroluj konflikty před zápisem.** Jakmile máš užší výběr, požádej AI, aby spustila
   `vse_check_timetable_conflicts` a odhalila překryvy dřív, než se zavážeš.
4. **Použij optimalizátor pro pomoc s rozvrhováním.** Popiš svá omezení přirozeným jazykem - AI je přeloží do parametrů
   optimalizátoru.
