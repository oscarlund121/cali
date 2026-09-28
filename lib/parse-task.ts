import { addDays, format, getDay } from "date-fns";

const BOARDS = ["school", "work", "personal"];

const MONTHS: Record<string, number> = {
  jan: 0, january: 0, feb: 1, february: 1, mar: 2, march: 2, apr: 3, april: 3,
  may: 4, jun: 5, june: 5, jul: 6, july: 6, aug: 7, august: 7, sep: 8, sept: 8,
  september: 8, oct: 9, october: 9, nov: 10, november: 10, dec: 11, december: 11,
  januar: 0, februar: 1, marts: 2, maj: 4, juni: 5, juli: 6, oktober: 9,
};

const WEEKDAYS: Record<string, number> = {
  sunday: 0, monday: 1, tuesday: 2, wednesday: 3, thursday: 4, friday: 5,
  saturday: 6, "søndag": 0, mandag: 1, tirsdag: 2, onsdag: 3, torsdag: 4,
  fredag: 5, "lørdag": 6,
};

const SCHOOL_WORDS =
  /(school|study|kea|assignment|exam|homework|lecture|reading|read up on|exercise|exercises|øvelse|øvelser|eksamen|opgave|aflevering|lektion|undervisning)/i;
const WORK_WORDS =
  /(work|job|internship|portfolio|client|praktik|kunde|freelance)/i;

function ymd(d: Date): string {
  return format(d, "yyyy-MM-dd");
}

function nextWeekday(from: Date, weekday: number): Date {
  const diff = (weekday - getDay(from) + 7) % 7;
  return addDays(from, diff);
}

function extractDue(
  text: string,
  today: Date,
): { due: string | null; remainder: string } {
  let t = text;

  // ISO: 2026-10-09 / 2026/10/09
  const iso = t.match(/\b(20\d{2})[-/](\d{1,2})[-/](\d{1,2})\b/);
  if (iso) {
    const due = ymd(new Date(+iso[1], +iso[2] - 1, +iso[3]));
    return { due, remainder: t.replace(iso[0], " ") };
  }

  // "in N days"
  const inDays = t.match(/\bin\s+(\d+)\s+days?\b/i);
  if (inDays) {
    return { due: ymd(addDays(today, +inDays[1])), remainder: t.replace(inDays[0], " ") };
  }

  // relative words
  const rel: Array<{ re: RegExp; days: number }> = [
    { re: /\b(i dag|today|tonight)\b/i, days: 0 },
    { re: /\b(i morgen|tomorrow)\b/i, days: 1 },
    { re: /\b(i overmorgen|day after tomorrow)\b/i, days: 2 },
    { re: /\b(næste uge|next week)\b/i, days: 7 },
  ];
  for (const r of rel) {
    if (r.re.test(t)) {
      return { due: ymd(addDays(today, r.days)), remainder: t.replace(r.re, " ") };
    }
  }

  // weekday names (with optional "next")
  const wd = t.match(
    /\b(næste |next )?(søndag|mandag|tirsdag|onsdag|torsdag|fredag|lørdag|sunday|monday|tuesday|wednesday|thursday|friday|saturday)\b/i,
  );
  if (wd) {
    const weekday = WEEKDAYS[wd[2].toLowerCase()];
    let d = nextWeekday(today, weekday);
    if (wd[1]) d = addDays(d, 7);
    return { due: ymd(d), remainder: t.replace(wd[0], " ") };
  }

  // month name + day: "oct 1", "october 1", "1 oct", "1. oktober"
  const md = t.match(/\b([a-zæøå]+)\.?\s+(\d{1,2})\b/i);
  if (md) {
    const mon = MONTHS[md[1].toLowerCase().replace(/\.$/, "")];
    if (mon !== undefined) {
      const day = +md[2];
      let year = today.getFullYear();
      if (new Date(year, mon, day) < addDays(today, -7)) year += 1;
      return { due: ymd(new Date(year, mon, day)), remainder: t.replace(md[0], " ") };
    }
  }
  const dm = t.match(/\b(\d{1,2})\s+([a-zæøå]+)\b/i);
  if (dm) {
    const mon = MONTHS[dm[2].toLowerCase()];
    if (mon !== undefined) {
      const day = +dm[1];
      let year = today.getFullYear();
      if (new Date(year, mon, day) < addDays(today, -7)) year += 1;
      return { due: ymd(new Date(year, mon, day)), remainder: t.replace(dm[0], " ") };
    }
  }

  // numeric dd/mm
  const num = t.match(/\b(\d{1,2})[./](\d{1,2})\b/);
  if (num) {
    const day = +num[1];
    const mon = +num[2] - 1;
    let year = today.getFullYear();
    if (new Date(year, mon, day) < addDays(today, -7)) year += 1;
    return { due: ymd(new Date(year, mon, day)), remainder: t.replace(num[0], " ") };
  }

  return { due: null, remainder: t };
}

export type ParsedTask = {
  title: string;
  due: string | null;
  board: string;
  priority: number;
};

export function parseTaskInput(raw: string, now: Date = new Date()): ParsedTask {
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  let text = raw.trim();

  // 1. explicit board prefix: "school: ..."
  let board = "personal";
  let boardExplicit = false;
  const bm = text.match(/^([a-z0-9_-]+)\s*[:：]\s*(.*)$/i);
  if (bm && BOARDS.includes(bm[1].toLowerCase())) {
    board = bm[1].toLowerCase();
    boardExplicit = true;
    text = bm[2];
  }

  // 2. leading label: "school task ..." / "work ..."
  const label = text.match(/^(school|work|personal)\s+(task|todo|job|thing|stuff|item)\b/i);
  if (!boardExplicit && label) {
    board = label[1].toLowerCase();
    boardExplicit = true;
    text = text.replace(label[0], " ");
  }

  // 3. priority
  let priority = 3;
  const pr = text.match(/\b(urgent|asap|critical|important|p1|prio\s*1)\b/i);
  if (pr) {
    priority = 1;
    text = text.replace(pr[0], " ");
  } else {
    const p2 = text.match(/\b(medium|p2|prio\s*2)\b/i);
    if (p2) {
      priority = 2;
      text = text.replace(p2[0], " ");
    }
  }

  // 4. date
  const { due, remainder } = extractDue(text, today);
  text = remainder;
  if (due) {
    // a date trigger word ("due"/"by"/"on"/…) was left behind when the date
    // was stripped — drop it from the end of the title.
    text = text.replace(/\b(due|deadline|frist|senest|til|by|on|for)\s*$/i, " ");
  }
  text = text.replace(/\b(due|deadline|frist|senest)\b/gi, " ");

  // 5. board keyword (if still personal)
  if (!boardExplicit) {
    if (SCHOOL_WORDS.test(text)) board = "school";
    else if (WORK_WORDS.test(text)) board = "work";
  }

  // 6. clean title
  const filler =
    /^(?:add|create|new|please|remember to|remind me to|task|todo|to-do|a|an|the)\b\s*/i;
  while (filler.test(text)) text = text.replace(filler, "");
  const title = text
    .replace(/^\s*[:：,;]+\s*/, "")
    .replace(/\s+/g, " ")
    .trim();

  return {
    title: title || raw.trim(),
    due,
    board,
    priority,
  };
}
