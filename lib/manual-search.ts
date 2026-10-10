import { MANUAL, type ManualTopic } from "@/lib/admin-manual"

/**
 * Free-text search over the admin manual. An admin types a question in their
 * own words — "team forgot password", "how do I start next year", "judges
 * room", even with typos — and gets the closest topics, best first.
 *
 * No server or AI involved: each topic is indexed once from its title, the
 * alternative phrasings in `asks`, its keywords and its text. A query matches
 * on exact words, word forms (assigning/assigned → assign), synonyms
 * (room → venue, marks → score, batch → year) and near-misses (pasword).
 * Rare words count for more than common ones, and topics that cover more of
 * the query rank higher. Pure, so it runs in the browser.
 */

const STOPWORDS = new Set(
  (
    "a an the to of in on for is are was were be been being am i me my we our us you your it its this that these those " +
    "how do does did can could should would will shall may might must want need needs please there here get got " +
    "from at by as if so any some about with and or but not no what where when why which who whom whose " +
    "way ways make sure just also then than into onto out up down over again more most very really " +
    "thing things something anything everything one ones let lets im ive dont doesnt cant cannot isnt"
  ).split(" "),
)

/** Words that mean the same thing to an admin. Each group is searched as one. */
const SYNONYMS: string[][] = [
  ["password", "pass", "pw", "pwd", "credential", "credentials", "passcode"],
  ["login", "signin", "logon", "account", "user", "username", "id"],
  ["delete", "remove", "erase", "drop", "purge", "destroy", "discard"],
  ["add", "create", "new", "register", "make", "insert", "setup"],
  ["edit", "change", "update", "modify", "rename", "fix", "correct", "alter"],
  ["hide", "hidden", "disable", "deactivate", "suspend", "archive"],
  ["team", "group", "student", "students", "member", "members", "participant"],
  ["mentor", "guide", "senior", "advisor", "supervisor"],
  ["evaluator", "judge", "faculty", "jury", "examiner", "assessor", "panel", "professor", "teacher", "staff"],
  ["score", "mark", "marks", "grade", "points", "result", "results", "rating"],
  ["leaderboard", "ranking", "rank", "standing", "standings", "winner", "winners", "top", "position"],
  ["round", "rubric", "criteria", "criterion", "evaluation", "assessment"],
  ["venue", "room", "hall", "lab", "class", "classroom", "location", "place", "seat"],
  ["theme", "domain", "topic", "track", "category", "area", "sdg"],
  ["year", "edition", "batch", "season", "session", "cycle", "academic", "annual", "next"],
  ["timeline", "schedule", "calendar", "agenda", "dates", "date", "plan", "programme", "program", "event"],
  ["guideline", "guidelines", "instruction", "instructions", "template", "rule", "rules"],
  ["submission", "submit", "deck", "ppt", "pptx", "presentation", "slides", "file", "upload", "drive", "canva"],
  ["pdf", "excel", "xlsx", "export", "download", "print", "sheet", "report", "document", "documents"],
  ["publish", "release", "visible", "show", "announce", "reveal"],
  ["allocate", "assign", "allocation", "assignment", "match", "matching", "pair", "map"],
  ["tie", "tiebreak", "equal", "same", "draw", "tied"],
  ["open", "enable", "unlock", "allow", "start"],
  ["close", "lock", "stop", "block", "freeze", "end"],
  ["current", "live", "active", "activate", "ongoing"],
  ["past", "previous", "old", "last", "earlier", "history"],
  ["forgot", "forgotten", "lost", "reset"],
  ["error", "bug", "broken", "problem", "issue", "fail", "failed", "wrong", "not", "working"],
  ["dashboard", "home", "cockpit", "overview", "main"],
  ["public", "website", "visitor", "visitors", "everyone", "outside"],
  ["ai", "mcp", "claude", "assistant", "agent", "bot", "chatgpt", "automation"],
]

/** A rough English stemmer: enough to match plural and tense variants. */
function stem(word: string): string {
  let w = word
  if (w.length > 5 && w.endsWith("ies")) return w.slice(0, -3) + "y"
  if (w.length > 6 && w.endsWith("ing")) w = w.slice(0, -3)
  else if (w.length > 5 && w.endsWith("ed")) w = w.slice(0, -2)
  else if (w.length > 5 && /(ss|x|ch|sh)es$/.test(w)) w = w.slice(0, -2)
  else if (w.length > 3 && w.endsWith("s") && !w.endsWith("ss")) w = w.slice(0, -1)
  // assigning → assign, allocated → allocat(e): trim a doubled final letter.
  if (w.length > 4 && w[w.length - 1] === w[w.length - 2] && !/(ss|ll)$/.test(w)) w = w.slice(0, -1)
  return w
}

function normalize(text: string): string {
  return text
    .toLowerCase()
    .replace(/[’']/g, "")
    .replace(/[^a-z0-9@.]+/g, " ")
    .replace(/(^|\s)\.+|\.+(\s|$)/g, " ")
    .trim()
}

function tokens(text: string): string[] {
  return normalize(text)
    .split(/\s+/)
    .filter((t) => t && !STOPWORDS.has(t))
    .map(stem)
}

const SYNONYM_OF = new Map<string, number>()
SYNONYMS.forEach((group, i) => group.forEach((w) => SYNONYM_OF.set(stem(w), i)))
const SYNONYM_GROUPS = SYNONYMS.map((g) => [...new Set(g.map(stem))])

/** Levenshtein distance, giving up once it exceeds `max`. */
function editDistance(a: string, b: string, max: number): number {
  if (Math.abs(a.length - b.length) > max) return max + 1
  let prev = Array.from({ length: b.length + 1 }, (_, i) => i)
  for (let i = 1; i <= a.length; i++) {
    const cur = [i]
    let rowMin = i
    for (let j = 1; j <= b.length; j++) {
      cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1))
      rowMin = Math.min(rowMin, cur[j])
    }
    if (rowMin > max) return max + 1
    prev = cur
  }
  return prev[b.length]
}

interface IndexedTopic {
  topic: ManualTopic
  /** token → field weight (the strongest field it appears in). */
  weights: Map<string, number>
  /** Title and asks without stopwords, for whole-phrase matches. */
  phrases: string[]
  /** Title and asks as written (normalized), for queries that are all stopwords. */
  rawPhrases: string[]
}

const FIELD_WEIGHTS = { title: 4, asks: 3, keywords: 3, summary: 1.5, body: 1 }

function indexTopic(topic: ManualTopic): IndexedTopic {
  const weights = new Map<string, number>()
  const add = (text: string, w: number) => {
    for (const t of tokens(text)) weights.set(t, Math.max(weights.get(t) ?? 0, w))
  }
  add(topic.title, FIELD_WEIGHTS.title)
  topic.asks.forEach((a) => add(a, FIELD_WEIGHTS.asks))
  topic.keywords.forEach((k) => add(k, FIELD_WEIGHTS.keywords))
  add(topic.summary, FIELD_WEIGHTS.summary)
  ;[...(topic.steps ?? []), ...(topic.notes ?? [])].forEach((s) => add(s, FIELD_WEIGHTS.body))
  return {
    topic,
    weights,
    phrases: [topic.title, ...topic.asks].map((p) => tokens(p).join(" ")),
    rawPhrases: [topic.title, ...topic.asks].map(normalize),
  }
}

let INDEX: IndexedTopic[] | null = null
let IDF: Map<string, number> | null = null

function getIndex() {
  if (!INDEX || !IDF) {
    INDEX = MANUAL.map(indexTopic)
    const df = new Map<string, number>()
    for (const it of INDEX) for (const t of it.weights.keys()) df.set(t, (df.get(t) ?? 0) + 1)
    const n = INDEX.length
    IDF = new Map([...df].map(([t, d]) => [t, Math.log(1 + n / d)]))
  }
  return { index: INDEX, idf: IDF }
}

/** How well one query word matches a topic, 0 when it doesn't. */
function wordScore(q: string, it: IndexedTopic, idf: Map<string, number>): number {
  const direct = it.weights.get(q)
  if (direct) return direct * (idf.get(q) ?? 1)

  let best = 0
  const group = SYNONYM_OF.get(q)
  if (group !== undefined) {
    for (const s of SYNONYM_GROUPS[group]) {
      const w = it.weights.get(s)
      if (w) best = Math.max(best, w * (idf.get(s) ?? 1) * 0.8)
    }
  }
  if (q.length >= 4) {
    const maxEdits = q.length >= 8 ? 2 : 1
    for (const [t, w] of it.weights) {
      if (t.length < 3) continue
      let factor = 0
      if ((t.startsWith(q) || q.startsWith(t)) && Math.min(t.length, q.length) >= 4) factor = 0.6
      else if (editDistance(q, t, maxEdits) <= maxEdits) factor = 0.65
      if (factor) best = Math.max(best, w * (idf.get(t) ?? 1) * factor)
    }
  }
  return best
}

export interface ManualHit {
  topic: ManualTopic
  score: number
}

/** The topics that best answer `query`, best first. Empty when nothing fits. */
export function searchManual(query: string, limit = 6): ManualHit[] {
  const { index, idf } = getIndex()
  const qTokens = [...new Set(tokens(query))]
  if (qTokens.length === 0) {
    // Only common words ("what is this"): match a phrasing word for word.
    const raw = normalize(query)
    if (raw.split(" ").length < 2) return []
    return index
      .filter((it) => it.rawPhrases.some((p) => p === raw || p.startsWith(`${raw} `)))
      .slice(0, limit)
      .map((it) => ({ topic: it.topic, score: 10 }))
  }
  const phrase = qTokens.join(" ")

  const hits: ManualHit[] = []
  for (const it of index) {
    let sum = 0
    let matched = 0
    for (const q of qTokens) {
      const s = wordScore(q, it, idf)
      if (s > 0) {
        sum += s
        matched += 1
      }
    }
    if (matched === 0) continue
    const coverage = matched / qTokens.length
    let score = sum * (0.4 + coverage)
    if (qTokens.length > 1) {
      if (it.phrases.some((p) => p.includes(phrase))) score += 8
      else {
        // Reward neighbouring query words that appear together in a phrasing.
        for (let i = 0; i < qTokens.length - 1; i++) {
          const pair = `${qTokens[i]} ${qTokens[i + 1]}`
          if (it.phrases.some((p) => p.includes(pair))) score += 2
        }
      }
    }
    hits.push({ topic: it.topic, score })
  }

  hits.sort((a, b) => b.score - a.score)
  const top = hits[0]?.score ?? 0
  if (top < 1.5) return []
  return hits.filter((h) => h.score >= top * 0.35).slice(0, limit)
}

/** Where to start when a search finds nothing. */
export const SUGGESTED_TOPIC_IDS = [
  "start-new-year",
  "add-user",
  "reset-password",
  "create-round",
  "publish-leaderboard",
  "allocate-mentor",
]
