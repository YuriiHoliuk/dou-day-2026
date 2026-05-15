// One-shot scraper for the DOU Day 2026 agenda.
//
// Re-fetches https://ticket.dou.ua/dou-day-2026/agenda, parses every
// `[data-agenda-filter-target="item"]` card, and writes
// `src/data/agenda.json` in the shape declared by `agenda.types.ts`.
//
// Talk ids are deterministic: `day{N}-{ROOM|main|External}-{HHMM}-{slug}-{HTMLIndex}`.
// The HTML traversal index is preserved as the trailing `-{N}` suffix so that
// existing localStorage plans / share URLs stay valid across re-scrapes.
//
// Usage:
//   node scripts/scrape-agenda.mjs            # writes src/data/agenda.json
//   node scripts/scrape-agenda.mjs --dry-run  # prints to stdout, doesn't write

import { writeFileSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import * as cheerio from 'cheerio';

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(__dirname, '..');
const SOURCE_URL = 'https://ticket.dou.ua/dou-day-2026/agenda';
const OUT_PATH = resolve(REPO_ROOT, 'src/data/agenda.json');

const DAYS = [
  { day: 1, date: '2026-05-15', label: 'Day 1' },
  { day: 2, date: '2026-05-16', label: 'Day 2' },
  { day: 3, date: '2026-05-17', label: 'Day 3' },
];

// Ukrainian → Latin transliteration (matches the slugs already shipped in agenda.json).
const TRANSLIT = {
  а: 'a', б: 'b', в: 'v', г: 'h', ґ: 'g', д: 'd', е: 'e', є: 'ie', ж: 'zh', з: 'z',
  и: 'y', і: 'i', ї: 'i', й: 'i', к: 'k', л: 'l', м: 'm', н: 'n', о: 'o', п: 'p',
  р: 'r', с: 's', т: 't', у: 'u', ф: 'f', х: 'kh', ц: 'ts', ч: 'ch', ш: 'sh', щ: 'shch',
  ь: '', ю: 'iu', я: 'ia', ʼ: '', '’': '', '‘': '', "'": '',
};

function slugify(s) {
  const lower = (s || '').toLowerCase();
  let out = '';
  for (const ch of lower) {
    if (TRANSLIT[ch] !== undefined) out += TRANSLIT[ch];
    else if (/[a-z0-9]/.test(ch)) out += ch;
    else out += '-';
  }
  return out.replace(/-+/g, '-').replace(/^-|-$/g, '').slice(0, 40);
}

function pad2(n) {
  return String(n).padStart(2, '0');
}

function minutesToHHMM(minTotal) {
  const m = Math.round(Number(minTotal));
  return `${pad2(Math.floor(m / 60))}:${pad2(m % 60)}`;
}

function detectSocialType(url) {
  if (!url) return 'link';
  const u = url.toLowerCase();
  if (u.includes('linkedin.com')) return 'linkedin';
  if (u.includes('facebook.com') || u.includes('fb.com')) return 'facebook';
  if (u.includes('twitter.com') || u.includes('x.com')) return 'twitter';
  if (u.includes('github.com')) return 'github';
  if (u.includes('instagram.com')) return 'instagram';
  if (u.includes('youtube.com') || u.includes('youtu.be')) return 'youtube';
  if (u.includes('t.me') || u.includes('telegram.')) return 'telegram';
  if (u.includes('dou.ua')) return 'dou';
  return 'link';
}

// Heuristic: split the role string into role + company.
// Mirrors the original parse documented in agenda.meta.md.
function splitRoleCompany(raw) {
  const role = (raw || '').trim();
  if (!role) return { role: undefined, company: undefined };
  // Try " в " / " at " / " @ " separators first.
  const sepRe = /\s+(?:в|at|@)\s+/i;
  const m = role.match(sepRe);
  if (m && m.index !== undefined) {
    return {
      role: role.slice(0, m.index).trim(),
      company: role.slice(m.index + m[0].length).trim() || undefined,
    };
  }
  // Comma-separated: "Managing Director, DXC Luxoft" → role + company.
  const comma = role.indexOf(',');
  if (comma > -1) {
    const before = role.slice(0, comma).trim();
    const after = role.slice(comma + 1).trim();
    if (before && after) return { role: before, company: after };
  }
  return { role, company: undefined };
}

function classifyType(title, room, hasSpeakers) {
  const t = (title || '').toLowerCase();
  if (room === 'External') return 'sideEvent';
  if (/реєстра[цс][іi][ії]/.test(t) || /^початок\s+реєстра/.test(t)) return 'registration';
  if (/afterparty|афтерпаті|афтепаті/.test(t)) return 'afterparty';
  if (/концерт|виступ\s+гурту/.test(t)) return 'performance';
  if (/^воркшоп|^workshop|^майстер[- ]?клас/.test(t)) return 'workshop';
  if (/панельна\s+дискусія|панель\s+дискусія/.test(t)) return 'panel';
  if (room === 'PODCAST' || /^запис\s+подкасту|подкаст/.test(t)) return 'podcast';
  if (/keynote|кейноут/.test(t)) return 'keynote';
  if (/^обід|перерва|кава[- ]брейк|coffee\s+break|lunch/i.test(t)) return 'break';
  if (!hasSpeakers && room === '') return 'registration';
  return 'talk';
}

async function fetchHtml() {
  const res = await fetch(SOURCE_URL, {
    headers: { 'User-Agent': 'Mozilla/5.0 (DOU Day mirror scraper)' },
    redirect: 'follow',
  });
  if (!res.ok) throw new Error(`Fetch failed: ${res.status} ${res.statusText}`);
  return await res.text();
}

function parseAgenda(html) {
  const $ = cheerio.load(html);
  const cards = $('[data-agenda-filter-target="item"]').toArray();

  const days = new Map(DAYS.map((d) => [d.date, d]));
  const tracks = new Set();
  const rooms = new Set();
  const talks = [];

  cards.forEach((el, htmlIndex) => {
    const $el = $(el);
    const date = $el.attr('data-date');
    const startsMin = $el.attr('data-starts-minutes');
    if (!date || startsMin === undefined) return; // skip the day-3 yellow banner

    const dayMeta = days.get(date);
    if (!dayMeta) return;

    const endsMin = $el.attr('data-ends-minutes');
    const startTime = minutesToHHMM(startsMin);
    const endTime = minutesToHHMM(endsMin);
    const durationMin = Math.round(Number(endsMin) - Number(startsMin));

    const stage = ($el.attr('data-stage') || '').trim();
    let room = stage;
    let roomLabel = '';

    // The room label sits in a `.text-sm.leading-snug` next to the time.
    const stageLabel = $el.find('.text-sm.leading-snug').first().text().trim();
    if (stageLabel) roomLabel = stageLabel;

    // Title
    const title = $el.find('.font-semibold').first().text().trim();

    // Tags
    const tagAttr = $el.attr('data-tags') || '[]';
    let tags = [];
    try { tags = JSON.parse(tagAttr.replace(/&quot;/g, '"')); } catch { tags = []; }

    // Description (collapsed paragraph). Replace <br> with \n.
    const descEl = $el.find('[data-agenda-toggle-target="content"]').first();
    let description;
    if (descEl.length) {
      // Convert <br> to newline before reading text.
      descEl.find('br').replaceWith('\n');
      description = descEl.text().trim();
      if (!description) description = undefined;
    }

    // Speakers — each speaker block has `<img alt="Name">` + role + optional moderator pill.
    const speakers = [];
    $el.find('img[alt]').each((_, img) => {
      const $img = $(img);
      const name = ($img.attr('alt') || '').trim();
      // Skip the side-event cover image (alt="" or no name).
      if (!name) return;
      // Skip if not a speaker headshot (rounded-full class).
      const cls = $img.attr('class') || '';
      if (!/rounded-full/.test(cls)) return;
      const photoUrl = $img.attr('src') || undefined;
      const $row = $img.parent();
      const $info = $row.find('> div').last();
      const $nameAnchor = $info.find('a').first();
      const socialUrl = $nameAnchor.attr('href');
      const isModerator = $info.find('.bg-purple-700\\/50, .bg-purple-700').length > 0;
      const roleText = $info.find('.text-sm.text-gray-400').first().text().trim();
      const { role, company } = splitRoleCompany(roleText);
      const speaker = { name };
      if (role) speaker.role = role;
      if (company) speaker.company = company;
      if (photoUrl) speaker.photoUrl = photoUrl;
      if (isModerator) speaker.isModerator = true;
      if (socialUrl) speaker.socials = [{ type: detectSocialType(socialUrl), url: socialUrl }];
      speakers.push(speaker);
    });

    // Day-3 side event extras: cover image + lu.ma registration link.
    let coverImageUrl;
    let registrationUrl;
    if (date === '2026-05-17') {
      const cover = $el.find('img').filter((_, i) => {
        const c = $(i).attr('class') || '';
        return /object-cover/.test(c) && !/rounded-full/.test(c);
      }).first();
      if (cover.length) coverImageUrl = cover.attr('src') || undefined;
      const reg = $el.find('a[href*="lu.ma"], a[href*="luma.com"]').first();
      if (reg.length) registrationUrl = reg.attr('href') || undefined;
      if (!room) room = 'External';
      // For Day 3 partner events the location string sits in `.text-sm.text-gray-400.mb-3`.
      if (!roomLabel) {
        const loc = $el.find('.text-sm.text-gray-400').first().text().trim();
        if (loc) roomLabel = loc;
      }
    }

    const type = classifyType(title, room, speakers.length > 0);

    if (room && room !== 'External') rooms.add(room);
    for (const t of tags) tracks.add(t);

    const slug = slugify(title);
    const idRoom = room || 'main';
    const id = `day${dayMeta.day}-${idRoom}-${startTime.replace(':', '')}-${slug}-${htmlIndex}`;

    const talk = {
      id,
      day: dayMeta.day,
      date,
      startTime,
      endTime,
      durationMin,
      room: room || '',
      roomLabel: roomLabel || '',
      title,
      language: 'UA',
      type,
      speakers,
    };
    if (tags.length) {
      talk.track = tags[0];
      talk.tags = tags;
    }
    if (description) talk.description = description;
    if (coverImageUrl) talk.coverImageUrl = coverImageUrl;
    if (registrationUrl) talk.registrationUrl = registrationUrl;

    // Field ordering to roughly match the existing JSON layout.
    const ordered = {
      id: talk.id,
      day: talk.day,
      date: talk.date,
      startTime: talk.startTime,
      endTime: talk.endTime,
      durationMin: talk.durationMin,
    };
    if (talk.track) ordered.track = talk.track;
    if (talk.tags) ordered.tags = talk.tags;
    ordered.room = talk.room;
    ordered.roomLabel = talk.roomLabel;
    ordered.title = talk.title;
    if (talk.description) ordered.description = talk.description;
    ordered.language = talk.language;
    ordered.type = talk.type;
    ordered.speakers = talk.speakers;
    if (talk.coverImageUrl) ordered.coverImageUrl = talk.coverImageUrl;
    if (talk.registrationUrl) ordered.registrationUrl = talk.registrationUrl;
    talks.push(ordered);
  });

  // Sort talks: by day, then by startTime, then by room (alphabetical),
  // matching the order of entries in the existing agenda.json.
  talks.sort((a, b) => {
    if (a.day !== b.day) return a.day - b.day;
    if (a.startTime !== b.startTime) return a.startTime.localeCompare(b.startTime);
    if (a.room !== b.room) {
      if (!a.room) return -1;
      if (!b.room) return 1;
      return a.room.localeCompare(b.room);
    }
    return a.title.localeCompare(b.title);
  });

  const event = {
    name: 'DOU Day 2026',
    venue: 'Kyiv, Ukraine',
    days: DAYS,
    tracks: [...tracks].sort((a, b) => a.localeCompare(b)),
    rooms: [...rooms].sort((a, b) => a.localeCompare(b)),
    sourceUrl: SOURCE_URL,
    scrapedAt: new Date().toISOString(),
  };

  return { event, talks };
}

// Levenshtein distance, normalized.
function lev(a, b) {
  const m = a.length, n = b.length;
  if (!m) return n;
  if (!n) return m;
  const dp = new Array(n + 1);
  for (let j = 0; j <= n; j++) dp[j] = j;
  for (let i = 1; i <= m; i++) {
    let prev = dp[0];
    dp[0] = i;
    for (let j = 1; j <= n; j++) {
      const tmp = dp[j];
      dp[j] = a[i - 1] === b[j - 1]
        ? prev
        : 1 + Math.min(prev, dp[j], dp[j - 1]);
      prev = tmp;
    }
  }
  return dp[n];
}

function similarity(a, b) {
  const A = (a || '').toLowerCase().trim();
  const B = (b || '').toLowerCase().trim();
  if (!A && !B) return 1;
  if (!A || !B) return 0;
  const dist = lev(A, B);
  const maxLen = Math.max(A.length, B.length);
  return 1 - dist / maxLen;
}

// Apply id-stability heuristic: when a parsed entry has a NEW computed id but
// is clearly the same talk as a removed entry, reuse the OLD id so that
// localStorage plans / share URLs survive minor upstream edits.
//
// Two-pass match (best-fit greedy):
//   pass 1 — same day + room + start time, title similarity > 0.5
//            (covers the spec's strict slot-match case + minor title edits)
//   pass 2 — same day + room (any time), title similarity > 0.85
//            (covers slot moves where the talk is unambiguously the same)
function stabilizeIds(oldTalks, newTalks) {
  const oldById = new Map(oldTalks.map((t) => [t.id, t]));
  const newById = new Map(newTalks.map((t) => [t.id, t]));

  const removedIds = new Set([...oldById.keys()].filter((id) => !newById.has(id)));
  const addedIds = [...newById.keys()].filter((id) => !oldById.has(id));

  function tryMatch(newId, predicate, threshold) {
    const newTalk = newById.get(newId);
    if (!newTalk) return false;
    let bestOldId = null;
    let bestScore = threshold;
    for (const oldId of removedIds) {
      const oldTalk = oldById.get(oldId);
      if (!predicate(oldTalk, newTalk)) continue;
      const score = similarity(oldTalk.title, newTalk.title);
      if (score > bestScore) {
        bestScore = score;
        bestOldId = oldId;
      }
    }
    if (bestOldId) {
      removedIds.delete(bestOldId);
      newTalk.id = bestOldId;
      newById.delete(newId);
      newById.set(bestOldId, newTalk);
      return true;
    }
    return false;
  }

  // Pass 1: strict slot match (day + room + startTime).
  const remainingAdded = [];
  for (const newId of addedIds) {
    const matched = tryMatch(
      newId,
      (o, n) => o.day === n.day && o.room === n.room && o.startTime === n.startTime,
      0.5,
    );
    if (!matched) remainingAdded.push(newId);
  }
  // Pass 2: time-shift inside the same day + room.
  for (const newId of remainingAdded) {
    // The id may have been kept; re-resolve via the original computed key.
    if (!newById.has(newId)) continue;
    tryMatch(
      newId,
      (o, n) => o.day === n.day && o.room === n.room,
      0.85,
    );
  }

  return newTalks;
}

function diff(oldData, newData) {
  const oldById = new Map(oldData.talks.map((t) => [t.id, t]));
  const newById = new Map(newData.talks.map((t) => [t.id, t]));

  const added = [];
  const removed = [];
  const changed = [];

  for (const [id, t] of newById) {
    if (!oldById.has(id)) added.push(t);
  }
  for (const [id, t] of oldById) {
    if (!newById.has(id)) removed.push(t);
  }
  for (const [id, n] of newById) {
    const o = oldById.get(id);
    if (!o) continue;
    const fields = ['title', 'startTime', 'endTime', 'room', 'roomLabel', 'track', 'description', 'language', 'type', 'coverImageUrl', 'registrationUrl'];
    const fieldDiffs = [];
    for (const f of fields) {
      const ov = o[f] ?? '';
      const nv = n[f] ?? '';
      if (ov !== nv) fieldDiffs.push({ field: f, old: ov, new: nv });
    }
    const oldSpeakers = (o.speakers || []).map((s) => s.name).sort();
    const newSpeakers = (n.speakers || []).map((s) => s.name).sort();
    const speakerDiff = JSON.stringify(oldSpeakers) !== JSON.stringify(newSpeakers);
    if (fieldDiffs.length || speakerDiff) {
      changed.push({
        id,
        title: n.title,
        fields: fieldDiffs,
        speakersAdded: newSpeakers.filter((s) => !oldSpeakers.includes(s)),
        speakersRemoved: oldSpeakers.filter((s) => !newSpeakers.includes(s)),
      });
    }
  }
  return { added, removed, changed };
}

function formatReport(diffResult, oldData, newData) {
  const lines = [];
  lines.push(`Total: old=${oldData.talks.length} new=${newData.talks.length}`);
  const byDayOld = {1:0,2:0,3:0}, byDayNew = {1:0,2:0,3:0};
  for (const t of oldData.talks) byDayOld[t.day]++;
  for (const t of newData.talks) byDayNew[t.day]++;
  lines.push(`Day 1: ${byDayOld[1]} -> ${byDayNew[1]}, Day 2: ${byDayOld[2]} -> ${byDayNew[2]}, Day 3: ${byDayOld[3]} -> ${byDayNew[3]}`);
  lines.push(`Added: ${diffResult.added.length}, Removed: ${diffResult.removed.length}, Changed: ${diffResult.changed.length}`);
  if (diffResult.added.length) {
    lines.push('--- Added ---');
    diffResult.added.forEach((t) => lines.push(`  + d${t.day} ${t.startTime} [${t.room||'-'}] ${t.title}`));
  }
  if (diffResult.removed.length) {
    lines.push('--- Removed ---');
    diffResult.removed.forEach((t) => lines.push(`  - d${t.day} ${t.startTime} [${t.room||'-'}] ${t.title}`));
  }
  if (diffResult.changed.length) {
    lines.push('--- Changed ---');
    diffResult.changed.forEach((c) => {
      const fnames = c.fields.map((f) => f.field).join(',') || '-';
      const sp = (c.speakersAdded.length || c.speakersRemoved.length)
        ? ` speakers:+${c.speakersAdded.length}/-${c.speakersRemoved.length}`
        : '';
      lines.push(`  ~ ${c.id.slice(0, 50)} fields:[${fnames}]${sp}`);
      for (const f of c.fields) {
        const o = String(f.old).slice(0, 60).replace(/\n/g, ' ');
        const n = String(f.new).slice(0, 60).replace(/\n/g, ' ');
        lines.push(`      ${f.field}: "${o}" -> "${n}"`);
      }
      if (c.speakersAdded.length) lines.push(`      speakers +: ${c.speakersAdded.join(', ')}`);
      if (c.speakersRemoved.length) lines.push(`      speakers -: ${c.speakersRemoved.join(', ')}`);
    });
  }
  return lines.join('\n');
}

async function main() {
  const args = new Set(process.argv.slice(2));
  const dryRun = args.has('--dry-run');

  const html = await fetchHtml();
  const parsed = parseAgenda(html);

  let oldData = null;
  try {
    oldData = JSON.parse(readFileSync(OUT_PATH, 'utf8'));
  } catch {
    oldData = { talks: [], event: { scrapedAt: null } };
  }

  // Apply id-stability heuristic: prefer existing ids when titles are fuzzy-similar.
  parsed.talks = stabilizeIds(oldData.talks, parsed.talks);

  // Preserve the previous scrape timestamp if there are zero changes (so noisy
  // commits don't happen). The caller decides whether to write.
  const diffResult = diff(oldData, parsed);
  const noChanges = !diffResult.added.length && !diffResult.removed.length && !diffResult.changed.length;

  const report = formatReport(diffResult, oldData, parsed);
  process.stderr.write(report + '\n');

  if (noChanges) {
    process.stderr.write('No changes detected.\n');
    if (!dryRun) {
      // Don't write — keeps scrapedAt stable so git stays clean.
    }
    process.exit(0);
  }

  const json = JSON.stringify(parsed, null, 2) + '\n';
  if (dryRun) {
    process.stdout.write(json);
  } else {
    writeFileSync(OUT_PATH, json);
    process.stderr.write(`Wrote ${OUT_PATH}\n`);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
