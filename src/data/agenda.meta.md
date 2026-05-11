# DOU Day 2026 — Agenda data notes

## Source

- URL: <https://ticket.dou.ua/dou-day-2026/agenda>
- Method: full HTML download via `curl -sL` (the page is **server-rendered Rails/Hotwire**, not a SPA, so all three days are in the initial HTML and no JSON API is needed).
- Parsed with Node + cheerio against `[data-agenda-filter-target="item"]` cards.
- Scraped: see `event.scrapedAt` in `agenda.json`.

## Totals

- **Days:** 3 (May 15, 16, 17, 2026)
- **Agenda entries:** **85**
  - Day 1 (2026-05-15): **38**
  - Day 2 (2026-05-16): **35**
  - Day 3 (2026-05-17): **12** (all partner / side events at external venues)
- **Unique speakers:** **97**
- **Tracks (10):** AI, Business, Deftech, Design, Engineering, Future, Gamedev, Leadership, Product, Security
- **Rooms / stages (6):** CORE, ENGINE, GROWTH, FUTURE, BUSINESS, PODCAST

## Entry-type breakdown

| type          | count |
| ------------- | ----- |
| `talk`        | 55    |
| `workshop`    | 8     |
| `panel`       | 3     |
| `podcast`     | 4     |
| `registration`| 2     |
| `afterparty`  | 1     |
| `performance` | 1     |
| `sideEvent`   | 11    |

`sideEvent` is used for Day-3 partner events that happen at external venues (each has its own lu.ma `registrationUrl` and a `coverImageUrl`).

## Gaps & data-quality notes

- **All content is Ukrainian.** `language` is hard-coded to `"UA"`. The site does not declare a per-talk language attribute.
- **Speaker `role` vs `company`** is split heuristically (first comma, or " в "/" at " separator). For roles without a delimiter (e.g. `"CEO DOU"`, `"Співзасновник і COO appflame"`) the full string lives in `role` and `company` is omitted. Don't rely on `company` being populated for every speaker.
- **Moderators**: marked via `speaker.isModerator: true` (extracted from the small "Модератор" pill on the site).
- **Socials**: only one link per speaker (the speaker-name anchor). Type is inferred from the host — LinkedIn / Facebook / DOU profile / etc.
- **Registration & afterparty entries** have empty `track`/`tags` and `speakers: []`. Same for some Day-3 community events.
- **Day-3 side events** have no `stage` (the partner events run off-site). For these:
  - `room` is set to `"External"` and `roomLabel` to the location string (e.g. `"Київ, Україна"`).
  - `coverImageUrl` and `registrationUrl` are populated.
  - `speakers` is empty (the agenda page doesn't list speakers for partner events).
- **Talk descriptions** are scraped from the collapsed `<p data-agenda-toggle-target="content">` — present for most session talks/panels/workshops, absent for breaks/registrations and most Day-3 side events.
- The site does **not** expose talk-level `endTime` text directly for some Day-3 items, but `data-starts-minutes` / `data-ends-minutes` are always present, so all `startTime`/`endTime`/`durationMin` values come from those numeric attributes.
- IDs are stable per scrape (built from `day-room-HHMM-slug-index`), but the trailing index will shift if upstream ordering changes — treat as opaque keys, not URL slugs.

## How to refresh

```bash
curl -sL https://ticket.dou.ua/dou-day-2026/agenda -o /tmp/dou_agenda.html
node /tmp/parse_dou.mjs   # see scraper sources for the parser script
```

(Parser script lives in the scraper teammate's working dir; re-create on demand if site markup changes.)
