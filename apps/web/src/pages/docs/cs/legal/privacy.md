---
title: Ochrana soukromí
section: Právní informace
order: 1
---

# Ochrana soukromí

_Aktualizováno 31. října 2026_

Kreditožrouti je nezávislý studentský projekt. Používání nevyžaduje účet. Aplikace čte veřejný katalog InSIS VŠE včetně jmen vyučujících přiřazených k předmětům. Jména jsou osobními údaji i tehdy, když jsou veřejně dostupná. Aplikace nepřistupuje k tvému účtu v InSIS, známkám ani zápisům.

## Kdo za službu odpovídá

Službu provozují správci projektu a rozhodují o zpracování údajů (jsou správcem podle GDPR). Za projektem nestojí žádná firma. Kontaktovat nás můžeš přes [issue v repozitáři](https://github.com/H7KZ/Kreditozrouti/issues); nepiš do něj veřejně osobní údaje, uveď jen, že potřebuješ jiný způsob odpovědi.

## Údaje používané službou

| Účel                                 | Údaje                                                                              | Uložení a doba uchování                                                                                     |
| ------------------------------------ | ---------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------- |
| Prohlížení předmětů                  | Veřejné údaje o předmětech, rozvrzích, studijních plánech, fakultách a vyučujících | Databáze aplikace; aktualizace z InSIS                                                                      |
| Plánování                            | Nastavení průvodce, dokončené předměty, rozvrhy a preference                       | Místní úložiště prohlížeče; smažeš je odstraněním dat prohlížeče                                            |
| Sdílené rozvrhy a kalendáře          | Vybrané jednotky (včetně jmen vyučujících) a nastavení kalendáře                   | Redis; odkaz vyprší po 180 dnech bez zobrazení, zobrazení lhůtu obnoví                                      |
| Analytika                            | Zobrazení stránek, zdroje návštěv a události funkcí                                | Vlastní instance Umami; plánované smazání po 13 měsících                                                    |
| Dobrovolná zpětná vazba              | Hodnocení a případný komentář, který odešleš                                       | Události Umami; plánované smazání po 12 měsících                                                            |
| Diagnostika chyb                     | Chyby JavaScriptu, adresa stránky a metriky Web Vitals                             | Vlastní Grafana Faro a Loki; logy nejdéle 7 dní                                                             |
| Zabezpečení a ochrana proti zneužití | IP adresa, cesta a stav požadavků na API a MCP                                     | Počitadla limitů a poslední chybové záznamy v Redis (nejdéle 24 hodin); serverové logy v Loki nejdéle 7 dní |

Komentář je volný text. Nevkládej do něj osobní údaje. I přes toto upozornění může komentář osobní údaje obsahovat. Zpětnou vazbu posíláme jen po odeslání. Sdílený rozvrh může zobrazit každý, kdo má odkaz.

## Cookies a sledování

Umami nepoužívá analytické cookies a aplikace nenastavuje žádné vlastní cookies. Místní úložiště prohlížeče obsahuje jen plánovací data a nastavení, která sám vytvoříš. Sledování relací a zachytávání konzole ve Faro je vypnuté, takže pro diagnostiku se neukládá trvalý identifikátor. Aplikace z adres odesílaných do Umami a Faro odstraňuje ID sdílených odkazů, parametry a fragmenty. Aplikace nezaznamenává kliknutí, posouvání, pohyb myši ani záznam relace.

## Jména vyučujících

Jména vyučujících pocházejí z veřejného katalogu InSIS a zobrazují se při procházení a filtrování předmětů a v detailech rozvrhu. Objevují se také ve sdílených odkazech a kalendářových exportech, které vytvoříš, a jsou dostupná schváleným partnerským integracím katalogového API projektu. MCP server pro AI asistenty jména vyučujících nevrací. Pokud jsi v katalogu uveden/a a chceš jméno ze služby odstranit, [kontaktuj nás](https://github.com/H7KZ/Kreditozrouti/issues); zdrojem jména zůstává InSIS a odtud se údaje obnovují.

## AI asistenti a MCP server

Projekt nabízí MCP server, přes který tebou zvolení AI asistenti vyhledávají předměty a kontrolují rozvrhy. Vrací údaje o předmětech, rozvrzích a studijních plánech, nikoli jména vyučujících. To, co asistent posílá svému poskytovateli (tvé dotazy a získané výsledky), zpracovává tento poskytovatel podle vlastních podmínek; nemáme to pod kontrolou. Tvou konverzaci nepřijímáme.

## Příjemci a předávání

Cloudflare zajišťuje doručování a ochranu webu a může zpracovávat data mimo EHP podle svých [podmínek zpracování údajů](https://www.cloudflare.com/cloudflare-customer-dpa/). Aplikační služby běží na infrastruktuře Contabo ve Francii. Analytika, diagnostika chyb a logy jsou provozovány vlastními silami; údaje neprodáváme ani nepoužíváme k reklamě či profilování.

## Právní základ

Při provozu, zabezpečení a zlepšování služby, poskytování veřejných informací o předmětech a ochraně před zneužitím vycházíme z oprávněného zájmu (čl. 6 odst. 1 písm. f) GDPR). Dobrovolnou zpětnou vazbu odesíláš podle svého rozhodnutí. Při přístupu ke službě se zpracovávají technické údaje požadavku včetně IP adresy.

## Tvá práva

Můžeš požádat o přístup, opravu, výmaz nebo omezení zpracování svých osobních údajů a vznést námitku proti zpracování na základě oprávněného zájmu. Místní data můžeš kdykoli smazat v prohlížeči. Se žádostí o serverové údaje [kontaktuj projekt](https://github.com/H7KZ/Kreditozrouti/issues) a uveď dost informací k jejich nalezení, například odkaz na sdílený rozvrh. U některých událostí analytiky a logů není uveden identifikátor uživatele, což může omezit možnost najít konkrétní záznam. Stížnost můžeš podat u [Úřadu pro ochranu osobních údajů](https://uoou.gov.cz) nebo u dozorového úřadu ve své zemi.

## Děti

Služba je určena vysokoškolským studentům a nezaměřuje se na děti.

## Změny

Zásady můžeme při změně služby aktualizovat; datum nahoře uvádí poslední revizi.

Projekt je nezávislý na VŠE. Omezení služby uvádějí [podmínky použití](terms.md).
