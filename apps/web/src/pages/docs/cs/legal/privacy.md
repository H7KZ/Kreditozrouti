---
title: Ochrana soukromí
section: Právní informace
order: 1
---

# Ochrana soukromí

_Aktualizováno 24. září 2026_

Kreditožrouti je studentský projekt. Používání nevyžaduje účet. Aplikace čte veřejný katalog InSIS VŠE včetně jmen vyučujících přiřazených k předmětům. Jména jsou osobními údaji i tehdy, když jsou veřejně dostupná. Aplikace nepřistupuje k tvému účtu v InSIS, známkám ani zápisům.

## Údaje používané službou

| Účel | Údaje | Uložení a doba uchování |
| --- | --- | --- |
| Prohlížení předmětů | Veřejné údaje o předmětech, rozvrzích, studijních plánech, fakultách a vyučujících | Databáze aplikace; aktualizace z InSIS |
| Plánování | Nastavení průvodce, dokončené předměty, rozvrhy a preference | Místní úložiště prohlížeče; smažeš je odstraněním dat prohlížeče |
| Sdílené rozvrhy a kalendáře | Vybrané jednotky a nastavení kalendáře při vytvoření odkazu | Redis; odkaz vyprší po 180 dnech bez zobrazení, zobrazení lhůtu obnoví |
| Analytika | Zobrazení stránek, zdroje návštěv a události funkcí | Vlastní instance Umami; plánované smazání po 13 měsících |
| Dobrovolná zpětná vazba | Hodnocení a případný komentář, který odešleš | Události Umami; plánované smazání po 12 měsících |
| Diagnostika chyb | Chyby JavaScriptu, adresa stránky a metriky Web Vitals | Vlastní Grafana Faro a Loki; logy nejdéle 7 dní |

Komentář je volný text. Nevkládej do něj osobní údaje. I přes toto upozornění může komentář osobní údaje obsahovat. Zpětnou vazbu posíláme jen po odeslání. Sdílený rozvrh může zobrazit každý, kdo má odkaz.

Umami nepoužívá analytické cookies. Aplikace z adres odesílaných do Umami a Faro odstraňuje ID sdílených odkazů, parametry a fragmenty. Sledování relací a zachytávání konzole ve Faro je vypnuté. Při přístupu ke službě se zpracovávají technické údaje požadavku včetně IP adresy. Cloudflare zajišťuje doručování a ochranu webu a může zpracovávat data mimo EHP podle svých [podmínek zpracování údajů](https://www.cloudflare.com/cloudflare-customer-dpa/); aplikační služby běží na infrastruktuře Hetzner v Německu.

Při provozu, zabezpečení a zlepšování služby vycházíme z oprávněného zájmu; dobrovolnou zpětnou vazbu odesíláš podle svého rozhodnutí. Úložiště prohlížeče slouží k plánovacím funkcím, které používáš. Místní data můžeš kdykoli smazat. Se žádostí o přístup, opravu nebo výmaz serverových údajů [kontaktuj projekt](https://github.com/H7KZ/Kreditozrouti/issues) a uveď informace potřebné k nalezení záznamu. Některé analytické události nemají identifikátor uživatele, takže nemusí být možné určit konkrétní záznam.

Projekt je nezávislý na VŠE. Omezení služby uvádějí [podmínky použití](terms.md).
