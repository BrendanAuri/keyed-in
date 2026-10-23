# Keyed In: chords, scales and theory by eye, hand and ear

## 1. Concept

A game for learning chords, scales and the theory around them, made for absolute beginners. Every question shows one of three things, a **name**, **keys** on a keyboard or a **sound**, and asks for another: "tap the notes of C major", "which chord is lit up?", "was that major or minor?", "play back what you heard". Feedback teaches, as in Dial In: it says what you did, what was asked and what the difference is, and lets you hear both.

A sibling app to [Dial In](https://brendanauri.github.io/dial-in/) (hear a sound, recreate it on a synth), with the same stack, look and deploy, and links between the two Home screens. Alongside the game, **tools** make it useful when you're writing or picking apart music: find the scales a set of notes belongs to, and look up the chords of a scale and how they feel. It runs in a browser on desktop and phones, and installs as an offline-capable app (PWA).

### Modes

| Mode | What it is |
| --- | --- |
| **Learn** | Packs of levels. Each level opens with a short interactive intro of its new items, then rounds of 10 questions. Stars and unlocks, as in Dial In (§9) |
| **Review** | The flash-card queue: everything due today, mixed across packs and question types. A few minutes a day (§10) |
| **Drill** | Endless questions from items you've learned, narrowed however you like ("just minor vs diminished") (§11) |
| **Daily** | The same 10 questions for everyone each day, with a score, a streak and spoiler-free share text. No backend (§12) |

Later: **Challenges** (send a friend a drill as a link, as Dial In does with sounds).

### Tools

| Tool | What it is |
| --- | --- |
| **Explore** | The playground: a keyboard that shows and plays any chord or scale and names whatever you play, and a circle of fifths you can tap. No scores. Dial In's Free Play, for theory (§13) |
| **Scale Finder** | Enter notes (tap them, type names, or type frequencies read off a spectrum analyser) and see the scales they fit, plus each note's frequency in every octave (§14.1) |
| **Scale Guide** | Pick a scale and see its chords with their names and Roman numerals, how each tends to feel, where each likes to go next, and common progressions to loop (§14.2) |

## 2. Goals and non-goals

**Audience**: absolute beginners first. Nothing assumes you can read music, name a note or know what a chord is. People with some experience can skip ahead (§9.4). Later packs (Electronic and Bass Music) and the tools also serve self-taught producers, Dial In's audience.

**Goals (v1)**
- Runs in modern desktop and mobile browsers; installs as a PWA and works offline after the first visit
- Phone-first: an on-screen keyboard you can play chords on with one hand
- Teaching built on what the evidence supports (§21): being asked rather than shown, spaced reviews, mixed practice, ear questions in a key, building answers rather than picking them, contrast, and several views of the same thing at once
- Plain words first: no term ("triad", "interval", "W W H") appears until an intro has shown what it means
- Content is data: levels live in packs, so a new pack needs no code changes
- Feedback that teaches, and lets you hear the difference

**v1 content**: the Foundations pack (§9.2).

**Non-goals (v1)**: accounts, backend, multiplayer, app-store builds, notation, fretboard, microphone input and Web MIDI. These come later (§17, §20).

## 3. Tech stack

The same as Dial In:

- **TypeScript** (strict) + **Vite** + **React**
- **Web Audio API** directly (no Tone.js). The voice engine is copied from Dial In in Milestone 2
- **vite-plugin-pwa** (with its `workbox-window` peer) for the manifest, service worker and offline cache. App icons are drawn by `scripts/make-icons.mjs` (`npm run icons`), with no image dependency
- **Vitest** for unit tests
- **localStorage** behind a small storage interface, with this app's own key prefix (§16)
- **GitHub Pages** through GitHub Actions

Two new dependencies were agreed in the plan: **ts-fsrs** (runtime, Milestone 6, review scheduling) and **tonal** (dev only, Milestone 1, a test oracle for the theory engine, the way Dial In uses Meyda). Ask before adding anything else.

## 4. Architecture

```
src/
  constants.ts   # every tunable number lives here
  theory/        # pure TS: notes, intervals, chords, scales, keys, numerals, chord naming, frequencies, scale matching
  audio/         # Web Audio: voice (from Dial In), patches, play note / chord / cadence / progression
  exercises/     # pure TS: one module per question type: generate, check, feedback
  srs/           # pure TS: items, FSRS wrapper, session builder, confusions
  content/       # plain data: schema.ts, packs/, feel.ts (how chords and moves tend to feel)
  game/          # rng, pack registry and unlocks, progress, placement, daily, share codes
  storage/       # key-value interface over localStorage, keyedin. prefix
  ui/
    components/  # Keyboard, AnswerGrid, NotePicker, CircleOfFifths, ResultCard, PlayButtons, UpdatePrompt
    screens/     # Start, Home, LevelSelect, Round, Result, Review, Drill, Daily, Explore, ScaleFinder, ScaleGuide, Stats
```

Built so far: `constants.ts`, `storage/`, `ui/components/UpdatePrompt.tsx` and `ui/screens/Home.tsx` (Milestone 0), and `theory/` (Milestone 1, §5).

Rules, in the same spirit as Dial In:
- `theory/`, `exercises/` and `srs/` never import React or touch the DOM.
- Every question comes from a seed, so any round can be replayed.
- `content/` is plain, JSON-serialisable data: no functions, no imports beyond types. Nothing outside it names a specific pack or level.
- No magic numbers outside `constants.ts` (small named constants at the top of a module are fine).
- Saved data is versioned, with a migration stub.

## 5. Theory engine (`src/theory/`)

Written in-house (Milestone 1): it's the heart of the app and not big. **Tonal** is a dev dependency, used only as an answer key in `oracle.test.ts`. That file checks, on all 21 natural, sharp and flat roots: every note's MIDI number and frequency, the interval between every pair of notes, every transposition, every chord type and scale, key signatures, the chords of major and minor keys (triads and sevenths, natural and harmonic minor), numeral roots, and the chord names for every inversion of every chord type.

| Module | What |
| --- | --- |
| `notes.ts` | Spelled notes (`Note`: a letter and an accidental) and pitches (`Pitch`: plus an octave; C4 is middle C, MIDI 60), because spelling matters (E♭ and D♯ are the same key but different notes). Reading ("Eb", "E♭", "F#4"), Unicode text for the screen and ASCII for ids, spoken names ("E flat"), pitch classes, and 12-bit sets of pitch classes |
| `intervals.ts` | Intervals as number and quality (m3, P5, A4, d5, up to doubly augmented or diminished), their size in semitones, names in words ("minor 3rd"), scale-degree labels (♭3, ♯4), the interval between two spelled notes, and transposing |
| `chords.ts` | 22 chord types as interval recipes from the root, each with a name in words, a symbol and a Roman-numeral ending: major, minor, 7, m7, maj7, 5, sus4, sus2, dim, aug, 6, m6, add9, madd9, m7♭5, dim7, 7sus4, 9, maj9, m9, m(maj7) and maj7♯5. Building, symbols, names, voicings and inversions |
| `scales.ts` | 13 scales and modes (major, the three minors, the other five modes, both pentatonics, blues and major blues), each with how common it is; building, names and degree labels |
| `keys.ts` | Key signatures, the line and circle of fifths, relative and parallel keys, and the chords of any seven-note scale with their numerals |
| `numerals.ts` | Roman numerals with quality (ii, V7, vii°, ♭VII): reading and writing them, the chord a numeral stands for in a key and back, and progressions ("I–V–vi–IV") |
| `naming.ts` | Keys in, every reasonable chord name out, best first (C, E, G, A is C6, then Am7/C); and whether what's played is one note, an interval or a chord, for Explore |
| `frequency.ts` | Note to frequency and back for any A4 reference (440 Hz by default), the nearest note and how many cents off, harmonics of a lower frequency, and a suggested A4 when every frequency is off by the same amount (§14.1) |
| `scaleMatch.ts` | The Scale Finder's matching: groups of scales that contain every note entered, and common scales that miss one (§14.1) |

How it spells and ranks things:
- **Spelling comes from intervals**, so every note is spelled for its job in the chord or scale: C augmented is C E G♯, and F major has B♭.
- **When nothing gives a spelling** (keys tapped on the keyboard), a root gets whichever of its sharp or flat names gives the chord or scale fewer accidentals: D♭ major, C♯ minor. Ties go to flats: G♭ major, E♭ minor. A slash chord's bass is spelled as the chord spells it, unless a plainer spelling exists (Eaug/C, not Eaug/B♯).
- **Double sharps and flats** show as ♯♯ and ♭♭, because many phone fonts can't show 𝄪 and 𝄫.
- **Chord names** that have the bass as the root come first, then the more common chord types, in the order of `CHORD_TYPES`.
- **Between two notes**, an interval goes up to the next note of that name: E to C is a minor 6th, and C to C♭ is a diminished octave.
- **Numerals** count against the major scale in every key and mode (§19).

## 6. Sound (`src/audio/`)

- Dial In's voice engine with a few fixed patches: soft electric piano, organ, pluck, pad. No synth knobs in this app.
- Helpers to play a note, a chord (together, arpeggiated or strummed), a cadence in a key (I–IV–V–I) and a progression at a tempo.
- Register and voicing are randomised within a level's limits, so players learn the sound of "minor", not of one particular minor chord.
- A Start screen with **Tap to start**, since mobile browsers need a tap before they play audio (as in Dial In).
- Maybe later: a sampled piano (a freely licensed one such as the Salamander Grand; check the licence and the download size). Beginners may recognise a piano more easily than a synth, so compare the two by ear in Milestone 2. Also Dial In sounds, from a pasted share code.
- Real songs appear by title and chord progression only, played on our own synth. No recordings.

## 7. Input

- **The on-screen keyboard is the main control.** Phone-first: one to two octaves showing, with octave shift buttons; large keys; multi-touch, so you can play chords; a toggle mode for building answers (tap a key to light it, tap again to clear it, then Check); note-name labels, on by default; and a landscape layout. Check at 320, 375 and 414 px.
- **Answer buttons** in a large grid, and a **note picker** (letter plus accidental) for spelling.
- **Computer keys**: a piano row on the letter keys, number keys for answers.
- Later: **Web MIDI** for a real keyboard (Chrome, Edge and Android Chrome; not iPhone), a fretboard view, staff notation and the microphone.

## 8. Question types (`src/exercises/`)

Each type is a pure module with `generate(params, rng)`, `check(question, answer)` and `feedback(result)`.

| Type | Shown → asked | Example | Answer with |
| --- | --- | --- | --- |
| `spell` | Name → keys | Tap the notes of D minor | Keyboard. Later levels also check spelling (E♭, not D♯) with a note picker |
| `change` | Keys and a new name → keys | Here's C major: make it C minor by moving one note | Keyboard |
| `fix` | Keys → keys | This should be A major, but one note is wrong: fix it | Keyboard |
| `identify` | Keys → name | Lit keys → "G major, first inversion" | Answer buttons |
| `hearQuality` | Sound → name | Interval, chord or scale quality, random root and register | Answer buttons |
| `echo` | Sound → keys | Hear a note, interval or chord (root given), play it back | Keyboard |
| `hearDegree` | Cadence and a note → degree | "That was the 3rd", then the note resolves home | Degree buttons 1–7 |
| `hearFunction` | Cadence and chord(s) → numerals | "I–V–vi–IV" | Numeral buttons |
| `progression` | Numerals in a key → keys, chord by chord | Build I–V–vi–IV in G, then hear it loop | Keyboard |
| `fact` | Name → name | Key signatures, relative minors, "the 5th of B♭" | Buttons or note picker |
| `sing` | Name → voice | "Sing the 3rd", then hear it | Self-graded at first; microphone later |

**Help that fades.** Keyboard questions take a `guide` parameter, so a level can start with plenty of help and take it away:
- `full`: the root is lit and the recipe is shown in plain words ("count 4 keys up, then 3 more"). A wrong key says why.
- `hint`: the root is given, and a Hint button shows the recipe. Using it rates the answer Hard for review.
- `none`: just the name.

**Feedback teaches**, like Dial In's tips. For example: "You played C, E, G: that's C major. C minor has E♭. The middle note is one key lower, and that's what makes it sound darker." Every miss offers **Yours / Correct / A-B**, so you hear the difference, not just read it.

**Grading.** Right or wrong, plus how long you took, sets the review rating automatically: wrong is Again, right but slow (or with a hint) is Hard, right is Good, right and fast is Easy. Time limits are per type, in `constants.ts`. The clock is never shown in Learn, so beginners aren't rushed; speed only feeds the review schedule. A `spell` answer with two of three notes right shows as partly right, but counts as wrong for scheduling.

## 9. Content: packs as data (`src/content/`)

### 9.1 Levels and items

Packs are plain, JSON-serialisable data, and nothing outside `content/` names a pack or level. A level lists: an intro (steps to hear, see and play the new items), the question types it uses with their parameters (including `guide`) and weights, its new items, and a pass rule. Rounds are 10 questions, about 70% on the level's new items and 30% on earlier ones (this settles Dial In's open "level focus" question from the start). Stars come from accuracy: 70% to pass, 85% for two stars and 95% for three, kept in `constants.ts`.

**Items** are what the review queue schedules:
- *Facts and spelling* are tracked per concept and root, such as `spell:minorTriad@F#` or `fact:keySignature@Ab`.
- *Ear skills* are tracked per concept, with the root random each time, such as `hearQuality:minor` within the level's set of choices. What you're learning is the sound, not one pitch.

**Ear questions start easy**: two choices that sound very different, with more added as you improve. When you mix two things up, they're played back to back.

### 9.2 Foundations (v1, 14 levels)

Chords come early, at level 3, because building them is the fun part. Key signatures wait until level 10, just before they're needed for the chords of a key.

| # | Level | New | Mostly |
| --- | --- | --- | --- |
| 1 | The keyboard | Note names, white and black keys, finding C | `spell` (single notes), `identify` |
| 2 | Half steps and whole steps | Half and whole steps, sharps and flats | `spell`, `identify` |
| 3 | Your first chord: major | A major chord as "a note, count 4 keys up, then 3 more" | `spell` (guide full, then hint), `identify` |
| 4 | Minor chords | Minor is major with the middle note one key lower | `change`, `spell`, `identify` |
| 5 | Major or minor? | Hearing major against minor | `hearQuality` (two choices), `echo` |
| 6 | The major scale | Whole, whole, half, whole, whole, whole, half | `spell`, `fix` |
| 7 | How far apart: intervals | Counting the distance; hearing the octave, fifth and third | `identify`, `hearQuality` |
| 8 | Interval quality | Major, minor and perfect; a minor 3rd against a major 3rd by ear | `identify`, `hearQuality` |
| 9 | Diminished and augmented | The other two three-note chords | `spell`, `change`, `hearQuality` |
| 10 | Key signatures and the circle of fifths | The sharps or flats in each key, neighbouring keys | `fact`, `spell` |
| 11 | Scale degrees by ear, part 1 | 1, 3 and 5 in a major key | `hearDegree` |
| 12 | Scale degrees by ear, part 2 | All seven | `hearDegree` |
| 13 | The chords of a key | The seven chords of a major key, Roman numerals | `spell`, `identify`, `fact` |
| 14 | First progressions | Hearing I, IV, V and vi; I–IV–V–I, I–V–vi–IV, ii–V–I | `hearFunction`, `progression` |

**Spelling**: enharmonics are accepted (D♯ for E♭) up to level 9. From key signatures on, answers must be spelt for the key.

### 9.3 More packs

1. **Chords and Colour**: inversions, sus2 and sus4, seventh chords, add9, hearing each, simple voice leading
2. **Minor Keys and Modes**: the three minors, relative and parallel keys, each mode by its colour note (Dorian's ♮6, Phrygian's ♭2, Lydian's ♯4, Mixolydian's ♭7), hearing modes over a drone
3. **Electronic and Bass Music**: minor-key loops (i–♭VI–♭III–♭VII and friends), Phrygian and harmonic-minor colour, fifths and power chords, following the root with a bassline, chord stabs, "build a four-chord loop in this key"
4. Later: jazz harmony, pentatonics and blues, reading notation, rhythm

### 9.4 Where you start: beginners and skipping ahead

- First launch asks: **New to music** (start at level 1) or **I know some basics**.
- **I know some basics** runs a short **placement check**: about two questions from each of levels 1–9 in order, stopping after a couple of misses. Every level it passes is unlocked and marked passed (with no stars), and its items go into Review so they come back soon.
- Every locked level has **Test out**: one round with no intro. Pass it to unlock that level and everything before it.
- Settings has **Show note names** (on by default) and **Replay intros**.

## 10. Review: the flash-card system (`src/srs/`)

- Scheduled with **FSRS**, the modern spaced-repetition algorithm (Anki has it built in), through the `ts-fsrs` package. Aim for 90% recall. Ratings come from §8's grading, so there are no "how well did you know this?" buttons, except on `sing` cards.
- The Review screen says how many are due today. Sessions are capped (about 20 questions or 5 minutes) and so are new items per day, so a day's review stays short.
- Mixed across types and packs, never the same item twice in a row.
- **Confusions**: when you take A for B, the next sessions add A-against-B questions until you tell them apart.
- **Stats**: recall per item, weakest items, and a confusion grid (what you hear as what), like Dial In's weakest controls.

## 11. Drill

- Pick from the items you've learned; questions are endless and mixed by default. Narrow by type, concept or pack ("just minor vs diminished").
- Later, an **arcade** variant: chord names fall and you build each before it lands. Opt-in, and never in Learn: timers stress beginners and reward guessing.

## 12. Daily challenge

- The same 10 questions for everyone on a date, seeded from the date, with no backend. Tiers by pack progress, as in Dial In.
- Score and time, a streak, and a spoiler-free share line with an emoji grid.
- Copy Dial In's `rng.ts` and `daily.ts`, and fingerprint the dailies in a stability test from the first release.

## 13. Explore

- Play notes (on screen, and later over MIDI) and it names the chord, with every reasonable name.
- Pick a root and a chord or scale: it lights up on the keyboard and plays. Inversions.
- A circle of fifths you can tap; a key opens in the Scale Guide.

## 14. Tools

These aren't games. They make the app useful when you're writing or picking apart music, and they reuse the theory engine. They link up: Scale Finder's results open in the Scale Guide.

### 14.1 Scale Finder

**Input**, in any mix:
- tap notes on the keyboard
- type note names (C, E♭, F♯ and so on)
- type frequencies in Hz, read off a spectrum analyser. Each snaps to the nearest note and shows how far off it is ("49.4 Hz → G1, +14 cents").

Optionally, mark the **home note**: the one the music feels like it rests on.

**Results**
- Scales that contain every note entered, ranked: fewest extra notes first, then common scales before rare ones (major and natural minor; then pentatonics and blues; then the other modes and the harmonic and melodic minors), with scales built on the home note first.
- Scales with the same notes are grouped. C major, A minor and D Dorian are the same seven notes with a different home, so they show as one result with the home choices under it, not as seven results.
- **One note off**: near matches that contain all but one of the notes ("A minor, except G♯: that's A harmonic minor"), because songs borrow chords, and analyser peaks get misread.
- With only a few notes, lots of scales fit. The results say so and suggest adding notes.
- Tap a result to hear it or to open it in the Scale Guide.

**Frequencies**
- Each note entered shows its frequency in every octave from 0 to 8, with the sub and bass range (about 20–250 Hz) highlighted. Its neighbours either side are shown too, so you can see how close notes are down low (a half step at 41 Hz is under 2.5 Hz).
- **A4 reference**: 440 Hz by default, with 432 and 442 Hz presets, or any value. If every frequency entered is off by about the same amount, it suggests the song is tuned differently and offers to switch.
- **Harmonics check**: one bass note shows several peaks on an analyser, at 2, 3, 4 and 5 times its frequency (an octave up, an octave and a fifth, two octaves, two octaves and a major 3rd). When a frequency entered is a whole-number multiple of another one (within a tolerance), it's flagged ("165 Hz is the 3rd harmonic of 55 Hz (A1), so it's probably part of that note"), and a tap leaves it out of the search.
- A short tip on reading analysers: the lowest strong peak is usually the note; low notes are hard to read exactly, so check a harmonic an octave or two up.

**Later**: drop in an audio file (decoded in the browser, never uploaded) or listen through the microphone, and get a key estimate from the notes it hears (a chromagram compared with key profiles). It's shown as a guess with its confidence, since key detection is often wrong on real tracks. Web MIDI input when that arrives.

### 14.2 Scale Guide

Pick a root and a scale, or arrive from Scale Finder, Explore or the circle of fifths.

- **The scale**: its notes on the keyboard, its steps, how it tends to feel ("bright", "dark", "dreamy") always next to its real name, and, for modes, the colour note that sets it apart from major or minor (Dorian's ♮6).
- **Bass frequencies**: each note's frequency in octaves 1 and 2 (about 32–130 Hz), for tuning a kick, sub or 808 to the key.
- **Its chords**: the three-note and seventh chord on each degree, with name (Am, Am7), Roman numeral (vi), notes and a play button. Each has a feel tag that comes from its job in the key, for example:
  - I: home, settled
  - IV: opens up, lifts away
  - V: tension, pulls back home
  - vi: soft, a little sad
  - ii: gentle, on the move
  - iii: in between, uncertain
  - vii°: unstable, tense
  - and in minor: i, a dark home; ♭VI, lifting and hopeful; ♭VII, bold; iv, mournful; V (from harmonic minor), a dramatic pull home.
- **What next?**: tap a chord to see where it likes to go, each move with how it tends to feel and an A-B play of the two chords. It's built from a small set of named moves rather than text for every pair:
  - **Going home** (V → I): resolved, finished
  - **Soft landing** (IV → I): the gentle "amen" ending
  - **The fake-out** (V → vi): you expect home and land somewhere sadder, which can feel unsettling
  - **Lift** (I → IV): opening up
  - **Building tension** (IV → V, ii → V)
  - **Darkening** (IV → iv, a chord borrowed from minor): bittersweet
- **Progressions**: common ones in the scale, with how they feel and where you hear them (I–V–vi–IV in pop; vi–IV–I–V; ii–V–I in jazz; i–♭VI–♭III–♭VII, epic and emotional, common in trance and EDM; i–♭VII–♭VI–V, the Andalusian cadence), looped at a tempo you pick.
- **Links into Learn**: each section links to the level that teaches it ("How this works: Foundations 13").

Feel words are written as "often heard as". A chord's feel depends on the key, the tempo, the sound and the listener. They live in `content/feel.ts` as data, per scale degree and chord quality and per move, so the guide needs no text for each key.

**Later**: more borrowed chords (♭VI and ♭VII in a major key), copying a progression as text, and exporting it as a MIDI file to drop into a DAW (a small hand-written encoder, no dependency).

## 15. UI and UX

- Portrait-first, dark theme, large touch targets. Dial In's look, with its own accent colour (amber, where Dial In is teal), so the two apps are easy to tell apart.
- **PWA**, as in Dial In: a manifest (standalone, dark theme, 192, 512 and maskable icons, an Apple touch icon and iOS meta tags), everything precached, a "Keyed In now works offline" notice the first time, and "A new version of Keyed In is ready" with **Reload** / **Later**, so an update never interrupts a round. An install card comes in Milestone 9.
- **Navigation**: hash routes, so the back button and reloads keep your place (from Milestone 2).
- **Home**: the modes under **Play** and the tools under **Tools**, as cards, and a card linking to Dial In. From Milestone 5 it also shows where to continue, and later today's daily and how many reviews are due.

Milestone 0's Home shows the four modes and three tools as "Coming soon", and the Dial In card.

## 16. Persistence

All storage goes through `storage/storage.ts`, and every key starts with `keyedin.` (build them with `storageKey()` in `storage/keys.ts`). Both apps live on the `brendanauri.github.io` origin, so they share localStorage, and Dial In's keys start with `dialin.`. Service workers and their caches are scoped by path (`/dial-in/` and `/keyed-in/`), so the two apps can be installed side by side and both work offline; check this once in Milestone 9.

Planned keys, each versioned with a migration stub: `keyedin.progress` (levels, stars, the run in progress, placement), `keyedin.review` (an FSRS card per item, confusions) and `keyedin.settings` (note names, A4 reference, sound). Ask for persistent storage on the first save.

## 17. Milestones

Build in order. Each milestone ends with `npm test` and `npm run build` passing, a check in the browser at phone widths, SPEC.md and docs/handoff.md updated, and a commit.

| # | Milestone | What |
| --- | --- | --- |
| 0 | Set up | Scaffold, SPEC.md, CLAUDE.md, README and handoff; a Home screen that links to Dial In; PWA shell and icons; deploy workflow |
| 1 | Theory engine | Notes, intervals, chords, scales, keys, numerals and naming, with correct spelling; frequencies and scale matching. Thorough tests, checked against Tonal |
| 2 | Sound and keyboard | Audio from Dial In, playback helpers, the multi-touch phone keyboard, the Start screen and routes, Explore v1. Compare synth and piano sounds |
| 3 | Tools | Scale Finder and Scale Guide (chords, feel, What next?, progressions), with feel content as data |
| 4 | Questions | `spell` (with `guide`), `change`, `fix`, `identify`, `hearQuality`, `echo` and `fact`; the question screen; feedback with A-B; a Drill picker |
| 5 | Packs and Learn | Pack schema and validation, Foundations levels 1–10 with intros, progress, stars, unlocks; the first-launch choice, placement check and Test out |
| 6 | Review | Item tracking, FSRS, the daily queue, confusions, Stats |
| 7 | Ear in context | Cadences, `hearDegree`, `hearFunction` and `progression`; Foundations levels 11–14 |
| 8 | Daily | Daily challenge, streaks, share text, stability test |
| 9 | Polish and links | Install card, an offline check with both apps installed, the link back from Dial In, a phone pass |
| 10+ | More | Chords and Colour, Minor Keys and Modes, Electronic and Bass Music; Web MIDI; fretboard; singing with the microphone; notation; challenge links; Drill arcade; Scale Finder audio input; MIDI export |

## 18. Conventions

- TypeScript strict; no `any`.
- No magic numbers outside `src/constants.ts`.
- Small, documented functions in `theory/`, `exercises/` and `srs/`.
- Match the surrounding code: comments that say why, plain names.
- On-screen text uses plain words, and introduces a term before using it.
- Stop after each milestone, summarise what was built and how to run it, and recommend the next step.

## 19. Decisions

### Settled (2026-10-24)

| Decision | Settled |
| --- | --- |
| Name | **Keyed In**. It pairs with Dial In: both mean "focused", and a key is a musical key. A quick search found no app with that name |
| One app or two | **A sibling app**, with links between the Home screens. The core loop is different (discrete questions and reviews, not knob settings), it keeps Dial In's dailies and share codes stable, and it gets its own icon and releases. The pieces worth sharing (seeded RNG, daily and streak logic, PWA setup, deploy workflow, voice) are copied once and left to diverge |
| Audience | **Absolute beginners first**, with a way to skip ahead (§9.4) |
| Foundations order | **Chords from level 3**; key signatures at level 10 (§9.2) |
| Beginner defaults | Note names shown, enharmonics accepted up to level 9, no visible clock in Learn, plain words before terms |
| Main mechanic | Building chords on the keyboard (`spell`, `change`, `fix`, `progression`), with help that fades (§8) |
| Theory library | Our own engine; Tonal as a dev-only test oracle |
| Numerals in minor keys and modes | **Counted against the major scale**: a minor key's chords are i, ii°, ♭III, iv, v, ♭VI and ♭VII. One rule for every key, mode and borrowed chord, as in pop and producer theory (textbooks often write VI and VII in minor instead) |
| Chord symbols | **Spelled out**: Cdim, Caug, Cm7♭5, easier for beginners to read. Roman numerals still use ° and + (vii°, ♭III+) |
| Octave numbers | **Middle C is C4** (scientific pitch), as in Dial In and most analysers and tuners. A setting for DAW numbering can come later (§20) |
| Tools | **Scale Finder** and **Scale Guide**, linked to each other, in Milestone 3 (§14) |
| Repo and hosting | github.com/BrendanAuri/keyed-in (public), `main` branch, deployed to brendanauri.github.io/keyed-in/ |

### Open

Settle each at the milestone that needs it. The first option is the recommendation.

1. **Sound** (Milestone 2): Dial In's synth patches (small, work offline), or a sampled piano. Compare them by ear.
2. **Tools timing** (Milestone 3): before the question types as planned (useful straight away, and the feel content feeds the Learn intros), or after Learn, if the game should come first.
3. **Ear items in Review** (Milestone 6): FSRS is built for remembering facts. It should still schedule ear skills sensibly, but a rolling accuracy may judge them better. Revisit after testing.
4. **Streak** (Milestone 8): a day counts when you play the daily *or* clear your reviews, or the daily only.
5. **Notation** (later): none in v1; Hooktheory, Meludia and Ableton all manage without it. A pack later.
6. **Second instrument view** (later): a fretboard for guitar and bass, or staff notation first.

## 20. Idea backlog (proposed, not committed)

- **Challenges**: send a friend a drill as a link.
- **Dial In sounds**: play this app's chords with a Dial In sound, from a pasted share code.
- **Drill arcade** (§11).
- **Scale Finder audio input** (§14.1).
- **Progression export**: copy as text, or a MIDI file for a DAW (§14.2).
- **Progression sketchpad**: pick numerals in a key and loop them, freely, beyond the Scale Guide's list. Useful for writing bass music.
- **DAW octave numbers**: a setting to show octaves as your DAW does. Ableton, Logic and Cubase call middle C "C3", and FL Studio calls it "C5". Matters most in the Scale Finder's frequency table.

## 21. Background: what this is built on

The full survey of existing apps, and the sources, are in [docs/plan.md](docs/plan.md) (§1, §2 and §17). In short:

**Borrowed from other apps**: a tiny lesson followed straight away by a drill (musictheory.net); drills you can narrow to your weak spots (teoria, ToneSavvy); set the key before any ear question, and resolve after every answer (Functional Ear Trainer); Roman numerals and real-song references (Hooktheory); play-first lessons with very little text (Ableton Learning Music); levels with stars that start with two choices (Perfect Ear, Music Theory Pro); daily workouts and streaks (ToneGym); feel words next to real names (Meludia); a keyboard designed for chords on phones (Duolingo Music's weak spot); spaced repetition (Anki); a playground with no scores (Chrome Music Lab).

**Methods with the best backing** (mostly general learning science; research on music apps themselves is thin):
1. **Retrieval and spacing**: being asked beats rereading, and spaced reviews beat cramming. Hence Review.
2. **Interleaving**: mixed practice beat practising one interval at a time in a study of melodic intervals (Wong, Chen and Lim, *Psychology of Music*), though learners believed the opposite. New items appear on their own briefly, then mixed in; mixed is the default.
3. **Hear notes in a key**: play a cadence before ear questions; reference songs are hints, not the method.
4. **Do it, don't just recognise it**: building a chord sticks better than picking it from a list (the generation effect). Hence building chords as the main mechanic.
5. **Contrast**: start with choices that sound very different, then close the gap; play confusions back to back.
6. **Several views at once**: every answer shows the name, the keys and the sound together.
7. **Singing**: optional, self-graded at first.
