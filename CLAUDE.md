# Turnly App — notes for Claude Code

This app runs on **Homeroom**. If you're Claude Code
editing this repo, read the platform conventions before making
changes:

**Platform conventions (authoritative, always current):**
https://app.onhomeroom.com/claude.md

Fetch that URL at the start of each session — it's the single source
of truth for platform-wide behavior (auth model, `USERNODE_ENV`,
public/private tables, "don't `git push`", etc.). The hosted copy is
updated in place when platform rules change, so fetching it gives you
today's rules, not a stale snapshot.

When running inside Homeroom's dev-chat, those same conventions are
already injected into your system prompt, so the fetch is a no-op in
that path — but it's the right reflex when someone runs Claude Code
against this repo locally or from another harness.

## Connector permission prompts

This repo ships `.claude/settings.json`, which allows the **read-only**
Homeroom connector calls (`mcp__homeroom__get_*`,
`…__list_*`, `…__whoami`) so they stop prompting one at a time. Everything
that acts — filing a request, opening or advancing a proposal — still asks.
Claude Code applies those rules only after you accept the
workspace trust dialog, which lists them for review. See `.claude/README.md`
for the whole story, including what to do if you are still being prompted
(usually: your connector is registered under a different name than the rules
assume).

## Check that this checkout is current

You may be working in a fork of this app whose `main` is behind the app's
canonical repository, and nothing in the checkout says so: `git fetch origin`
compares the fork with itself. This matters before you **read** code to answer
a question about how the app behaves now, not only before you edit it.

The canonical repository is named in `.claude/homeroom-canonical-repo`. Check against
it, not against `origin`:

```sh
git fetch "$(cat .claude/homeroom-canonical-repo)" main
git merge-base --is-ancestor FETCH_HEAD HEAD && echo current || echo behind
```

`behind` means this checkout does not contain the canonical `main`. To answer
a question, read the canonical code instead (`git show FETCH_HEAD:<path>`,
`git grep <pattern> FETCH_HEAD`). To change code, start from the exact base
commit your Homeroom work order gives, and never merge or rebase onto the
canonical `main` yourself: which commit a change is diffed against decides
what the group votes on. With the Homeroom connector, `get_checkout_status`
answers the same question.

A session-start hook (`.claude/hooks/homeroom-freshness.sh`, see `.claude/README.md`) runs
this check for you and tells you when you are behind. It is silent offline, so
its silence is not proof the checkout is current. Inside Homeroom's dev-chat
the platform fixes the base commit, and none of this applies.

## Starter template

The Homeroom starter screen (the "Starter template" card, the Press!
example, the `/api/press` and `/api/leaderboard` routes and the `presses`
table) was removed in Tahap 1 (Fondasi) and replaced by the app's real
design system — see "## Design" below. The foundation preview screen in
`public/index.html` is temporary: Tahap 2 replaces it with the real
Beranda and Detail arisan, reusing the components and demo data.

The screen has a light and a dark look and follows the viewer's Homeroom
theme, switching live when they change it: the theme `<script>` right after
the bridge tag sets a `dark` class on `<html>`. Keep that script, and give
everything you build both looks (the design kit's colour tokens carry both), unless one
fixed look is the point of this app, like a game's own scene; then say so
under "## Design" below. Unless a request asks for one, add
no theme picker: the viewer's Homeroom setting is the control. "The
platform's light/dark theme inside the app frame" in the platform
conventions has the details.

If a rule below this line conflicts with the hosted conventions, the
hosted conventions win. This file is **app-specific** — write down
things about *this* app that belong in the repo: product intent,
data-model quirks, style preferences, opt-in policies (e.g. which
tables you've marked private), etc.

---

## About Turnly App

Simplifies managing arisan groups and rotating savings contributions.
Arisan is usually run through WhatsApp chats; Turnly gives the group one
screen that answers "siapa sudah bayar, giliran siapa, dan apa yang harus
saya lakukan sekarang" — big text, big buttons, everyday Indonesian, for
members aged 25 to 65, many not tech-savvy.

## Design

This app's look. The first real version fills in the blanks; every later
change follows it, and updates it when a request changes the look on purpose.

- **Palette:** accent turmeric yellow (light `#F0A202`, dark `#F6B93B`) with
  indigo-ink text `#222B5A` on it; status green `#1B7F52`/`#55C890` (lunas),
  yellow-brown `#9A6200` (menunggu), red `#C0352B`/`#FF8279` (telat);
  neutrals lavender-grey `#F5F4F9` ground / navy `#141834` ground. Exact
  values live as `R G B` tokens in `styles/tailwind-input.css`.
- **Signature element:** the lingkaran giliran (turn circle, Tahap 2) —
  the status avatar circles built in Tahap 1 are its building blocks.
- **Type scale:** `text-small` 13px, `text-body` 15px, `text-heading` 19px,
  `text-title` 36px (big nominal amounts, in `font-display`). Bricolage
  Grotesque for display, Figtree for body, system sans fallback.

The kit is in `styles/tailwind-input.css`: colour tokens with a light and
a dark value (named in `tailwind.config.js`), and the components
(`btn-primary`, `btn-secondary`, `field`, `list` and `list-row`, `card`,
`chip` + status variants, `avatar` + status variants, `tag`, `hero`,
`section-label`, `skeleton`, `state-empty`, `state-error`). Buttons:
primary corners 14px / 48px tall, secondary and fields 10px / 44px. Status
chips are fully rounded and ALWAYS carry the status word; the four avatar
states differ by fill/border treatment, never colour alone (filled green /
dashed ochre outline / solid grey-blue outline / pink fill with red
outline). Lists are rows separated by thin lines, not stacks of cards. The
hero payment block has three large corners and one small one
(`24px 24px 24px 6px`).
Re-theme by changing the token values there, keeping every text pair at
4.5:1 or more in both looks. Bottom sheet and toast come from the
platform's `usernode-native` kit, themed via the `--un-*` overrides in the
same file — never hand-rolled.

- Colour comes only from the tokens (`bg-ground`, `bg-surface`,
  `text-fg`, `text-muted`, `border-line`, `bg-accent` with
  `text-on-accent`, ...): never a raw hex value or a stock palette class.
  The accent is a fill colour only — never `text-accent` on a light
  surface (the yellow fails contrast as text there).
- Tap targets are at least 44 px; the buttons and fields already are.
- Every screen that loads data has honest loading, empty and error states.
  Never show the empty state while loading or after a failure; an error says
  what failed, what still works, and offers Retry.
- Seed obviously fake staging demo data so the populated screen can be seen
  ("Staging mock data" in the platform conventions).
- No cards in cards, no uppercase eyebrows, no emoji as icons.

## App-specific conventions

- Money is always an integer number of rupiah (`formatRupiah` in
  `public/js/domain.js`), never a float, never decimals; display groups
  with Indonesian separators: `Rp500.000`.
- "Telat" is never stored; it is derived from the periode's due date at
  render time. All schedule arithmetic is calendar-date based in
  Asia/Jakarta (UTC+7, no DST) — parse `YYYY-MM-DD` as UTC
  (`parseHari`/`selisihHari` in `public/js/domain.js`).
- All UI text goes through `public/js/i18n.js` (`t(key, params)`); no
  hardcoded copy in markup. Indonesian for now, structured for more
  languages later.
- Demo data lives in `public/js/demo-data.js` and is anchored to
  `DEMO_HARI_INI = '2026-10-05'` so relative labels ("2 hari lagi",
  "Telat 3 hari") render the same on any day. Screens pass that anchor,
  not today's date, when rendering demo rows. Names and rekening numbers
  in demo data are obviously fake; never clone real users into it.
- Domain JS shapes mirror the planned database tables field for field
  (`arisan`, `anggota_arisan`, `periode`, `iuran`), so the backend stage
  slots in without renaming.
