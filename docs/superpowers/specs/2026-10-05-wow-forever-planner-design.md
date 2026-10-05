# WoW Forever Planner: design spec

Date: 2026-10-05. Status: draft for review. Destination of the wayfinder map in issue #1.
Vocabulary is in `/CONTEXT.md`. Research behind the facts below is on the remote branches `research/launch-dates` and `research/warlock-choices`.

## 1. Purpose

A temporary personal site where Filip works through every choice for playing a Horde Warlock in World of Warcraft: Forever, with a prominent countdown to launch. Guildmates (Balkanske Seljačine) can read it. Nobody else edits it. It is thrown away after the launch window.

Fixed facts, not decisions: Normal (PvE) ruleset, Horde, Warlock, guild Balkanske Seljačine. Filip logs in around 6 a.m. Zagreb time on launch day.

Success looks like this:
- Filip opens one page, sees how long is left, sees which decisions are due next, and can compare options and record a pick with a reason in under a minute.
- Every decision due before launch (pack, race, names, addons) has a recorded pick before its deadline.
- A guildmate with the link sees the same page without any edit controls.

## 2. Launch facts

Source: Blizzard news post (see `research/launch-dates` branch). Checked 2026-10-05.

- Launch is Wed 4 Nov 2026, 3:00 pm PST, which is 23:00 UTC, which is **00:00 on Thu 5 Nov in Zagreb** (CET, UTC+1). One global launch, no regional stagger.
- Early name reservation: 27 Oct to 3 Nov, up to 3 characters, first and second name, first come first served, a perk of the paid upgrade packs. Clock times are not published.
- Beta (17 Sep to 21 Oct) and Invite-A-Friend codes are not wanted.
- To recheck before 20 Oct: whether Blizzard has published clock times or changed anything.

The launch instant is a constant in the site code: `2026-11-04T23:00:00Z`. It is not stored in Firestore.

## 3. Scope

In scope:
- A static site on GitHub Pages with a countdown hero and a phase-grouped list of decision cards.
- Firestore as the only data store, public read, owner-only write.
- Owner sign-in with Google, an owner-only Import button, an owner-only way to set a pick, a reason and a status.

Out of scope:
- Anyone other than Filip writing, voting or commenting.
- Any server code, cloud functions, analytics or notifications.
- Guide content that duplicates Wowhead.
- Invite codes, beta play, leveling with the guild, a launch-night plan.
- Endgame decisions (placeholder only, see section 5).

## 4. Architecture

- **Hosting:** GitHub Pages from the `main` branch root of `Radulovic82/wow-forever-planner` (public repo). No Vercel.
- **Front end:** plain HTML, CSS and ES modules. No framework, no build step. The Firebase modular SDK is loaded from Google's CDN as ES modules.
- **Back end:** Firebase project `wow-forever-planner-57513` on the free Spark plan. Firestore (europe region) and Firebase Authentication with the Google provider. `radulovic82.github.io` is an authorized domain.
- **Config:** the Firebase web config is committed in the site code. It is a public identifier by design, and the security rules protect the data. Optional hardening: restrict the API key to the `radulovic82.github.io/*` referrer in Google Cloud Console.
- **Data flow:** the page reads the `decisions` collection with a live listener and renders it. The owner's actions write one decision document at a time.

Units, each with one job:
- `countdown`: pure functions that turn the launch constant and "now" into days, hours, minutes, seconds and a Zagreb-time label.
- `catalog`: validates the import JSON and merges it into existing documents.
- `store`: the only module that talks to Firestore and Auth.
- `view`: renders hero, phases and cards from plain data. It does not know about Firebase.

## 5. Data model

Collection `decisions`, one document per decision. The document id is a stable slug such as `pack`, `race`, `names`.

| Field | Type | Meaning |
|---|---|---|
| `title` | string | The question, for example "Which pack to buy?" |
| `phase` | string | `before-launch`, `launch-prep`, `leveling` or `endgame` |
| `topic` | string | A tag such as `purchase`, `character`, `build`, `logistics` |
| `order` | number | Position within its phase |
| `deadline` | timestamp or null | When something external closes. Null if none. |
| `kind` | string | `choice` (pick from options) or `freeform` (a written answer) |
| `maxPicks` | number | How many options may be chosen. Default 1. Professions use 2. |
| `options` | array | Each has `id`, `name`, `pros[]`, `cons[]`, `links[]` (label and url), optional `note` |
| `status` | string | `open`, `decided` or `revisit`. New documents are `open`. |
| `chosen` | array of option ids | Empty until decided. For `freeform` it stays empty. |
| `answer` | string | The written answer for `freeform`, otherwise empty |
| `reason` | string | Why, in Filip's words |
| `updatedAt` | timestamp | Set on every owner write |

The catalog fields are `title`, `phase`, `topic`, `order`, `deadline`, `kind`, `maxPicks`, `options`. The owner-state fields are `status`, `chosen`, `answer`, `reason`, `updatedAt`.

Endgame is a placeholder. The `endgame` phase renders a single "TBD, too far away" note and has no documents until December.

## 6. Security rules

- Read: allowed for everyone.
- Write (create, update, delete) on `decisions`: allowed only when `request.auth.uid` equals Filip's Firebase user ID.
- Everything else is denied.
- The rules use the opaque user ID, not an email, so no personal address appears in the public repo.
- The rules file `firestore.rules` lives in the repo and is deployed by pasting it into the Firebase console. No CLI login is used.
- Shape validation inside the rules is deliberately light. The only writer is the owner, so malformed data is a self-inflicted problem and the import validator catches it first.

## 7. Bootstrap order

1. Rules start fully locked (the current state of the project).
2. Filip opens the site and signs in with Google. The app shows his Firebase user ID. Authentication alone is enough for this, Firestore is not touched.
3. The user ID goes into `firestore.rules`, which is pasted into the Firebase console.
4. Filip clicks Import with the prepared catalog JSON.

Until step 3, nobody can write. If Filip signs in with the wrong Google account, the ID shown will not match, and the app says so.

## 8. Import

- An Import button, shown only when the signed-in user is the owner. The check is a convenience only, the rules are the real lock.
- The owner picks a catalog JSON file. Shape: `{ "version": 1, "decisions": [ ... ] }`, each entry holding the catalog fields from section 5 plus an `id`.
- The importer validates every entry first and refuses the whole file if any entry is invalid. It reports which entries and fields failed.
- For a new `id` it creates the document with `status: open`.
- For an existing `id` it updates only the catalog fields. It never overwrites `status`, `chosen`, `answer`, `reason` or `updatedAt`. If an option that was chosen no longer exists in the file, that decision is set to `revisit` and its `chosen` list is kept so nothing is lost silently.
- Import can be run again at any time to add or amend decisions.
- The catalog JSON is prepared by the assistant from the research and committed to the repo as `data/catalog.json`.

## 9. The initial catalog

Ten decisions in three phases, plus the endgame placeholder. Facts and sources for the options are in the two research branches and are copied into the catalog JSON with their confidence labels.

**Phase 1, Before launch (to 3 Nov)**
1. `pack`: Which pack to buy. Deadline 27 Oct. Options: Heroic, Epic, Collection. Beta and invite codes are not wanted, so this turns on price against extras. Heroic is the cheapest with name reservation, Epic adds 30 days of game time. Open fact to check: whether a subscription is needed from day one.
2. `race`: Orc, Troll or Undead. Settle before reserving names.
3. `names` (freeform): up to 3 names, first and second name. Deadline 3 Nov.

**Phase 2, Launch prep (to the evening of 4 Nov)**
4. `addons-ui` (freeform): addons, UI and keybinds. Deadline the evening of 4 Nov. Launch queues are a risk to note on the card, not a decision.

**Phase 3, Leveling (1 to 60)**, no hard deadline, first picks needed by launch morning
5. `spec`: Affliction, Demonology or Destruction.
6. `demon`: Imp, Voidwalker, Succubus or Incubus, Felhunter.
7. `professions` (maxPicks 2): two main professions, with the secondary ones noted.
8. `route`: the leveling zone order from Durotar or Tirisfal onward.
9. `dungeons`: whether and which dungeons to run while leveling, including the Horde-only Ruins of Lordaeron (15 to 20).
10. `legacy`: how to spend the 16 Legacy points.

**Phase 4, Endgame (from 9 Dec)**: TBD placeholder, no documents.

## 10. User interface

Layout from top to bottom:
1. **Countdown hero.** Large, the first thing on the page. Days, hours, minutes and seconds ticking each second, with the exact moment printed under it as `Thu 5 Nov 2026, 00:00 Zagreb time` (always rendered in `Europe/Zagreb`, whatever the viewer's timezone). After launch the hero switches to "Live" with the time since launch.
2. **Next up strip.** The open decisions with the nearest deadlines, with days left. A deadline within 7 days is highlighted.
3. **Phase sections**, in order. Each shows a progress count such as 2 of 3 decided.
4. **Decision cards.** Collapsed: title, status chip, deadline chip, and the chosen answer if decided. Expanded: the options side by side with pros, cons and source links, the reason, and a note about confidence where a fact is unverified.
5. **Owner controls**, hidden for visitors: a small Sign in with Google link in the footer. Once signed in as the owner: pick and unpick an option, write the reason, set the status, and the Import button. A small panel shows the user ID for bootstrap.

Other rules:
- Visitors see no edit controls and no sign-in prompt beyond the footer link.
- Responsive from a phone width up, with a 16 px side gutter and no horizontal scroll. Filip is likely to use it on his phone.
- Dark theme with Horde reds, readable contrast. Light or dark follows the system. The exact look is decided during the build, because the prototype step was skipped.
- All times shown to the viewer for deadlines are Zagreb time.

## 11. Error handling and states

- **Firestore unreachable or read denied:** a clear message under the hero, and the countdown still works because it needs no data.
- **Empty collection (before the first import):** visitors see "Nothing here yet". The owner also sees the Import button.
- **Not signed in, or not the owner:** read-only view. A signed-in non-owner sees "read only" and nothing else changes.
- **Write fails (for example rules not yet updated):** the card shows the error and keeps the unsaved pick so it can be retried.
- **Invalid import file:** nothing is written, and the failing entries are listed.
- **Clock skew:** the countdown uses the viewer's clock. A note says it assumes the device clock is right.

## 12. Testing

- Unit tests with `node:test` for the pure modules: countdown math (including the Zagreb label and the switch to "Live"), catalog validation, and the merge rules from section 8 (new document, update that keeps owner state, removed chosen option sets `revisit`).
- Security rules are checked by hand in the Firebase console Rules Playground: unauthenticated read allowed, unauthenticated write denied, a signed-in user with another ID denied, the owner's ID allowed.
- A manual checklist: sign in, wrong account, Import, re-Import with a changed option, pick and unpick, status changes, phone width, visitor view in a private window.

## 13. Deployment and cleanup

- GitHub Pages is enabled on `main` at the repo root. The site lives at `https://radulovic82.github.io/wow-forever-planner/`.
- Commits follow the personal-repo convention: short, casual, no Claude co-author trailer.
- When the project is over: delete the Firebase project and archive or delete the repo.

## 14. Open items

- Whether a subscription is required from day one, and the real pack prices (affect the `pack` card).
- Clock times for name reservation and the end of launch week are not published. Recheck Blizzard before 20 Oct.
- Onyxia on 9 Dec and the Summer 2027 professions timing are from a news report of the roadmap, not Blizzard text.
- The data behind spec, pet and talent facts is from the beta build and can still change before launch.
- Optional: restrict the Firebase API key by referrer.
