# DOU Day 2026 — Agenda data notes

## Source

- URL: <https://ticket.dou.ua/dou-day-2026/agenda>
- Method: full HTML download via `fetch` (the page is **server-rendered Rails/Hotwire**, not a SPA, so all three days are in the initial HTML and no JSON API is needed).
- Parsed with Node + cheerio against `[data-agenda-filter-target="item"]` cards.
- Scraped: see `event.scrapedAt` in `agenda.json`.
- Re-scraped: **2026-05-15** (latest refresh).

## Totals (as of 2026-05-15)

- **Days:** 3 (May 15, 16, 17, 2026)
- **Agenda entries:** **90** (was 85)
  - Day 1 (2026-05-15): **39** (was 38)
  - Day 2 (2026-05-16): **39** (was 35)
  - Day 3 (2026-05-17): **12** (unchanged — all partner / side events at external venues)
- **Unique speakers:** **103** (was 97)
- **Tracks (10):** AI, Business, Deftech, Design, Engineering, Future, Gamedev, Leadership, Product, Security
- **Rooms / stages (6):** BUSINESS, CORE, ENGINE, FUTURE, GROWTH, PODCAST

## Entry-type breakdown

| type          | count |
| ------------- | ----- |
| `talk`        | 58    |
| `workshop`    | 8     |
| `panel`       | 3     |
| `podcast`     | 5     |
| `registration`| 2     |
| `afterparty`  | 1     |
| `performance` | 1     |
| `sideEvent`   | 12    |

## 2026-05-15 refresh — meaningful changes

- **+5 net entries** (16 added, 11 removed, 21 changed).
- Day 1: registration moved 09:00 → 08:45; new talks "Прототип як інструмент менеджменту стейкхолдерів" (ENGINE 12:30), "Запис подкасту Сергія Немчинського: Як AI змінює професію розробника" (PODCAST 13:30), "Запис подкасту Women Make Money" (PODCAST 15:30), "Українська ідентичність … інтервʼю з Віталієм Портниковим" (CORE 16:00), "Воркшоп: Воно просто працює…" (GROWTH 16:00); afterparty got a description.
- Day 2: removed two `TBD` placeholders (CORE 10:30, ENGINE 10:30) and replaced with real sessions; added "Stand-up Василя Байдака", "Квантові комп'ютери вже тут", "Невигадані історії AI-first…" moved 11:00 → 10:30, "Як перейти з AAA в інді…", "Даркнет та сучасні кіберзагрози", "Інновації та регуляції…", "From Teams to Swarms", "Q&A з Міноборони" moved 13:30 → 14:30, "Архітектура постійних змін" moved 15:30 → 12:30, "Що буде з українським deftech" (CORE 15:30), "Збочення VS покращення" moved from Day 1 to Day 2 ENGINE 15:30, "Secret Guest" (CORE 16:20).
- Day 3: same 12 partner events; several end-times trimmed; "Coffee Rave від Headway Inc" pushed 10:00 → 11:00; new "Воркшоп від EVERSTAR: Найм без випадковостей" (12:00); "WORKSHOP: Unreal Engine + Airsim…" reclassified `workshop` → `sideEvent` (consistent with Day-3 partner-event policy); "AI Engineering Meetup" + "Онлайн-лекція: як працює AdTech" relabelled `External venue` → `Віртуальний`.
- Speaker swaps: "Хто потрібен ринку" (CORE 10:30) — Артур Міхно → Валерій Решетняк (CEO robota.ua).
- Data fixes (not source changes): three entries had `track` mistakenly set to the room name (`ENGINE` / `CORE`) when `data-tags="[]"`; now correctly omitted. One speaker name had stray `"\n        Модератор"` appended; now cleaned.

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
