/**
 * Type definitions for the DOU Day 2026 agenda dataset.
 *
 * The shape mirrors `agenda.json` exactly — every property that is optional in
 * the JSON is marked optional here, and every property that is always present
 * is marked required.
 *
 * Source: scraped from https://ticket.dou.ua/dou-day-2026/agenda
 */

/** Display label for a conference day. */
export interface AgendaDay {
  /** 1-based day index, ordered chronologically. */
  day: 1 | 2 | 3;
  /** ISO calendar date, e.g. "2026-05-15". */
  date: string;
  /** Human-readable label, e.g. "Day 1". */
  label: string;
}

/** Top-level event meta. */
export interface AgendaEvent {
  name: string;
  venue: string;
  days: AgendaDay[];
  /** All tracks/tags used across talks, alphabetised. */
  tracks: string[];
  /** Stage / room names that appear on the agenda (e.g. CORE, ENGINE…). */
  rooms: string[];
  sourceUrl: string;
  /** ISO timestamp of when this data was scraped. */
  scrapedAt: string;
}

/** A social/profile link associated with a speaker. */
export interface SpeakerSocial {
  type:
    | 'linkedin'
    | 'facebook'
    | 'twitter'
    | 'github'
    | 'instagram'
    | 'youtube'
    | 'telegram'
    | 'dou'
    | 'link';
  url: string;
}

/** A single speaker on a talk. */
export interface Speaker {
  /** Display name, exactly as on the site (Ukrainian). */
  name: string;
  /** Job title / role — e.g. "CEO", "Staff Front-End Engineer". */
  role?: string;
  /** Company / org name — e.g. "GitLab", "SoftServe". */
  company?: string;
  /** Absolute URL to the speaker headshot (Rails Active Storage variant). */
  photoUrl?: string;
  /** True for moderators of panel discussions. */
  isModerator?: boolean;
  /** External profile links scraped from the site. */
  socials?: SpeakerSocial[];
}

/** Classification of an agenda entry. */
export type AgendaEntryType =
  | 'talk'
  | 'keynote'
  | 'panel'
  | 'workshop'
  | 'podcast'
  | 'break'
  | 'lunch'
  | 'registration'
  | 'afterparty'
  | 'performance'
  /** Day-3 partner / side events at external venues with their own registration. */
  | 'sideEvent';

/** A single agenda entry — talk, panel, break, etc. */
export interface Talk {
  /** Stable id: `day{N}-{room}-{HHMM}-{slug}-{index}`. */
  id: string;
  day: 1 | 2 | 3;
  /** ISO date, mirrors AgendaDay.date. */
  date: string;
  /** "HH:MM" 24-hour, e.g. "10:30". */
  startTime: string;
  endTime: string;
  durationMin: number;
  /** Primary track tag (first of `tags`); absent for registration/breaks/side events. */
  track?: string;
  /** Full tag list as provided by the site. */
  tags?: string[];
  /** Stage code, e.g. "CORE" / "ENGINE". For day-3 side events: "External" or ''. */
  room: string;
  /** Localised room label including floor, e.g. "CORE, 3 поверх". */
  roomLabel: string;
  /** Talk title in original language (Ukrainian). */
  title: string;
  /** Long-form abstract; may be empty for breaks. */
  description?: string;
  /** Spoken language, always "UA" for DOU Day 2026 unless noted otherwise. */
  language?: 'UA' | 'EN';
  type: AgendaEntryType;
  speakers: Speaker[];
  /** Cover image (used by Day-3 side events / lu.ma posters). */
  coverImageUrl?: string;
  /** External registration link (Day-3 side events, lu.ma URLs). */
  registrationUrl?: string;
}

/** Root of `agenda.json`. */
export interface Agenda {
  event: AgendaEvent;
  talks: Talk[];
}
