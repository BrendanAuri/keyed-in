# Keyed In (working name): plan

> **Superseded by [SPEC.md](../SPEC.md)** (2026-10-24), which settles §16 and reorders Foundations. Kept for the app survey (§1), the research (§2) and the sources (§17).

A sibling app to [Dial In](https://brendanauri.github.io/dial-in/) for learning chords, scales and the theory around them: by eye, by hand and by ear. Dial In teaches you to hear a sound and recreate it on a synth. This app teaches you to hear notes and chords, name them and play them back.

This is the starting point for the new project. Milestone 0 turns it into `SPEC.md` (the design source of truth) and `CLAUDE.md`. Written 2026-10-24.

---

## 1. What's out there, and what to borrow

| App or site | What it does | What people praise (and criticise) | Borrow |
| --- | --- | --- | --- |
| **musictheory.net** (and its app, Tenuto) | Short free lessons, then drills: notes, key signatures, intervals and chords on staff, keyboard and fretboard, plus ear trainers | Free, clear, on most teacher and university resource lists | A tiny lesson followed straight away by a drill. Players choose what a drill includes |
| **teoria.com, ToneSavvy** | Customisable theory and ear drills, including functional scale degrees | You can drop what you already know and focus on what you miss | Drills you can narrow to your weak spots |
| **Functional Ear Trainer** (Alain Benbassat's method) | Plays a cadence to set the key, then one note. You name its scale degree, then it resolves the note home | 4.9 stars from about 3,400 ratings on the App Store. Often called the best place to start | Context first: always set the key before asking what you heard. Resolve after every answer |
| **Hooktheory** (books, Hookpad, TheoryTab) | Chords and melody taught through real pop songs, in Roman numerals, with no sheet music | Concepts are easy to apply. Too basic for advanced players | Real-song references. Roman numerals, so what you learn works in any key |
| **Ableton Learning Music** | Free browser lessons on beats, chords, melodies and basslines, each with a piano roll to play with | Learn by doing, very little text, examples from known tracks | Play-first lessons. The producer framing fits Dial In's audience |
| **Music Theory Pro, Perfect Ear, Complete Ear Trainer** | Levelled ear and theory drills on phones | Adjustable difficulty, turn answers on and off, gentle start | Levels with stars. Start with two choices, add more as you improve |
| **ToneGym, Theta Music Trainer** | Many small ear-training games, daily workouts | Motivating. ToneGym is criticised as pricey | Daily workout and streaks. Variety of game types |
| **Meludia** | Emotion-first ear training without notation, about 600 exercises | Teaches skills classes skip. Criticised for not linking its labels to real theory names | Describe sounds by feel ("bright", "tense"), but always next to the real name |
| **Duolingo Music** | Free notation and rhythm basics on an on-screen keyboard | Accessible. Chords are nearly impossible on a phone keyboard | Design the phone keyboard for chords from day one |
| **Anki** (shared music decks) | Spaced-repetition flash cards | Anecdotal: modest gains on chord naming, good for learning tunes | The scheduling. Anki can't make or check sounds, which is the gap this app fills |
| **Chrome Music Lab** | Playful toys for chords and arpeggios | No account, runs on phones | A playground mode with no scores |

## 2. Methods with the best backing

The research on music-learning apps themselves is thin. These come from general learning science and from what the praised apps have in common.

1. **Retrieval and spaced repetition.** Being asked beats rereading, and spacing reviews out beats cramming. This is well supported in general and plausible for music. It becomes the **Review** queue (§10).
2. **Interleaving.** A study of melodic intervals (Wong, Chen and Lim, *Psychology of Music*) found mixed practice beat practising one interval at a time when learners had no reference songs or singing to lean on, and most learners wrongly believed the blocked practice worked better. So: introduce a new item on its own briefly, then mix it in with everything else. Mixed is the default, not an option.
3. **Hear notes in a key, not in isolation.** Scale-degree hearing suits tonal music. Intervals help for passages that change key or have no clear key. Reference songs ("the first two notes of...") are a good early crutch. So: play a cadence before ear questions, and offer reference songs as hints, not as the method.
4. **Do it, not just recognise it.** Building a chord on the keyboard and playing back what you heard sticks better than picking from a list (the generation effect). It's also Dial In's core loop, so it gives the two apps the same feel.
5. **Contrast.** Start with choices that sound very different, then close the gap. When someone mixes up two things, play them back to back.
6. **Several views at once.** Every answer shows the name, the keys on the keyboard and the sound together (later the fretboard and the staff too).
7. **Singing.** Ear-training teachers recommend singing what you hear (Kodály, solfège). Offered as optional cards, self-graded at first.

## 3. One app or two? Recommendation: a sibling app

Build it as a separate app with the same stack, conventions and look as Dial In, deployed the same way, with links between the two Home screens.

- **Different core loop.** Dial In scores continuous knob settings against a target. This app asks discrete questions and schedules reviews. They share very little game logic.
- **Dial In's stability rules.** Dial In fingerprints its rounds so dailies and replay codes never change, and its share codes only grow at the end. A second app inside it adds risk to all of that for no gain.
- **Its own identity.** Its own icon on the phone, its own Home, a smaller download, and it can be released and changed without touching Dial In.
- **What's worth sharing is small and stable**: the seeded RNG, the daily-number and streak logic, the PWA setup, the deploy workflow and the synth voice. Copy these once and let them diverge. A shared package or monorepo isn't worth it for one developer; revisit only if you find yourself fixing the same bug in both.

Things to know about hosting both on GitHub Pages:

- Both apps live on the same origin (`brendanauri.github.io`), so they share `localStorage`. Dial In's keys start with `dialin.`; the new app needs its own prefix (e.g. `keyedin.`).
- Service workers and their caches are scoped by path (`/dial-in/` and `/keyed-in/`), so the two can be installed side by side and both work offline. Check this once in Milestone 8.
- A nice tie-in for later: the new app could play its chords with a Dial In sound, by pasting a Dial In share code.

## 4. Concept: hear it, name it, build it

Every question shows one of three things and asks for another:

| Shown | Asked for | Example |
| --- | --- | --- |
| Name | Keys | "Tap the notes of E♭ major" |
| Keys | Name | Three keys lit up: what chord is it? |
| Sound | Name | You hear a chord: major, minor or diminished? |
| Sound | Keys | You hear a chord: play it back (Dial In's loop) |
| Name | Sound | "Play a perfect fifth up from A" |
| Name | Name | "How many flats in A♭ major?" |

**The flash cards, made interactive.** A card isn't a fixed front and back. It's a template plus the theory engine, so "build a minor triad" covers every root and inversion and checks your answer itself. The review scheduler tracks each template-and-concept (for example "build a minor triad on F♯"), not a single picture.

### Modes

| Mode | What it is |
| --- | --- |
| **Learn** | Packs of levels. Each level opens with a short interactive intro of its new items, then rounds. Stars and unlocks, as in Dial In |
| **Review** | The flash-card queue: everything due today, mixed across packs and question types. A few minutes a day |
| **Drill** | Endless questions from items you've learned, narrowed however you like ("just minor vs diminished") |
| **Daily** | The same 10 questions for everyone each day, with a score, streak and spoiler-free share text. No backend |
| **Explore** | The playground: a keyboard that shows and plays any chord or scale, names whatever you play, and a circle of fifths you can tap. No scores. Dial In's Free Play, for theory |

Later: **Challenges** (send a friend a drill as a link, as Dial In does with sounds).

## 5. Question types

Each type is a pure module with `generate(params, rng)`, `check(question, answer)` and `feedback(result)`.

| Type | Shown → asked | Example | Answer with |
| --- | --- | --- | --- |
| `spell` | Name → keys | Tap the notes of D minor | Keyboard (tap to toggle notes, then Check). Later levels also check spelling (E♭, not D♯) with a note picker |
| `identify` | Keys → name | Lit keys → "G major, first inversion" | Answer buttons |
| `hearQuality` | Sound → name | Interval, chord or scale quality, random root and register | Answer buttons |
| `hearDegree` | Cadence and a note → degree | "That was the 3rd", then the note resolves home | Degree buttons 1–7 |
| `hearFunction` | Cadence and chord(s) → numerals | "I–V–vi–IV" | Numeral buttons |
| `echo` | Sound → keys | Hear a note, interval or chord (root given), play it back | Keyboard |
| `fact` | Name → name | Key signatures, relative minors, "the 5th of B♭" | Buttons or note picker, timed |
| `sing` | Name → voice | "Sing the 3rd", then hear it | Self-graded at first; microphone pitch later |

**Feedback teaches, like Dial In's tips.** For example: "You played C, E, G: that's C major. C minor has E♭. The third is a half step lower, and that's what makes it sound darker." Every miss offers **Yours / Correct / A-B**, so you hear the difference, not just read it.

**Grading.** Right or wrong, plus how long you took, sets the review rating automatically: wrong is Again, right but slow is Hard, right is Good, right and fast is Easy. Time limits are per type, in `constants.ts`. A `spell` answer with two of three notes right shows as partly right but counts as wrong for scheduling.

## 6. Theory engine (`src/theory/`, pure TypeScript)

- **Notes** as letter, accidental and octave, because spelling matters (E♭ and D♯ are the same key but different notes). Pitch class and MIDI number.
- **Intervals** as quality and number (m3, P5, A4, d5) with semitones. The interval between two spelled notes; transposing a spelled note by an interval.
- **Chords** as interval formulas from the root: major, minor, diminished, augmented, sus2, sus4, 6, m6, 7, maj7, m7, m7♭5, dim7, add9 and more later. Inversions and voicings.
- **Scales and modes**: major, the three minors, the modes, pentatonics, blues.
- **Keys**: signatures, the circle of fifths, diatonic chords, Roman numerals with quality (ii, V7, vii°), relative and parallel keys.
- **Naming**: notes in, every reasonable chord name out (C, E, G, A is both C6 and Am7/C). Explore and the "play anything" answers need it.

Recommended: write it in-house (it's the heart of the app and not big) and use **Tonal** as a dev dependency only, as a test oracle, the way Dial In uses Meyda.

## 7. Sound (`src/audio/`)

- Copy Dial In's voice engine and keep a few fixed patches: soft electric piano, organ, pluck, pad. No synth knobs in this app.
- Helpers to play a note, a chord (together, arpeggiated or strummed), a cadence in a key (I–IV–V–I) and a progression at a tempo.
- Randomise register and voicing within a level's limits, so players learn the sound of "minor", not of one particular minor chord.
- Later, maybe: a sampled piano (a freely licensed one such as the Salamander Grand; check the licence and the download size), and Dial In sounds by share code.
- Real songs appear by title and chord progression only, played on our own synth. No recordings.

## 8. Input

- **The on-screen keyboard is the main control.** Design it for phones first: one to two octaves showing with octave shift buttons, large keys, multi-touch so you can play chords, a toggle mode for spelling questions, optional note-name labels, and a landscape layout. Check at 320, 375 and 414 px.
- **Answer buttons** in a large grid, and a **note picker** (letter plus accidental) for spelling.
- **Computer keys**: a piano row on the letter keys, number keys for answers.
- **Web MIDI** for a real keyboard (Chrome and Edge, Android Chrome; not iPhone). Later.
- Later: fretboard view (guitar and bass), staff notation, microphone.

## 9. Content: packs as data (`src/content/`)

Same rules as Dial In: packs are plain JSON-serialisable data, and nothing outside `content/` names a pack or level.

A level lists: an intro (steps to hear, see and play the new items), the question types it uses with their parameters and weights, its new items, and a pass rule. Rounds are 10 questions, about 70% on the level's new items and 30% on earlier ones. That answers Dial In's open "level focus" question from the start. Stars from accuracy (for example 70% to pass, 85% for two stars, 95% for three), kept in constants.

**Items** are what the review queue schedules:
- *Facts and spelling* are tracked per concept and root, such as `spell:minorTriad@F#` or `fact:keySignature@Ab`.
- *Ear skills* are tracked per concept, with the root random each time, such as `hearQuality:minor` within the level's set of choices. What you're learning is the sound, not one pitch.

### Packs

1. **Foundations** (first pack, about 12 levels)
   1. The keyboard: note names, white and black keys, sharps and flats
   2. Half steps and whole steps
   3. The major scale (W W H W W W H): spell it from any note
   4. Key signatures and the circle of fifths
   5. Intervals by size: count them, hear the octave, fifth and third
   6. Interval quality: major, minor, perfect; m3 vs M3 by ear
   7. Major and minor triads: spell, identify, hear, play back
   8. Diminished and augmented triads
   9. Scale degrees by ear, part 1: 1, 3 and 5 in a major key
   10. Scale degrees by ear, part 2: all seven
   11. The chords of a major key and Roman numerals
   12. Hearing I, IV, V and vi: first progressions (I–IV–V–I, I–V–vi–IV, ii–V–I)
2. **Chords and Colour**: inversions, sus2 and sus4, seventh chords, add9, hearing each, simple voice leading
3. **Minor Keys and Modes**: the three minors, relative and parallel keys, each mode by its colour note (Dorian's ♮6, Phrygian's ♭2, Lydian's ♯4, Mixolydian's ♭7), hearing modes over a drone
4. **Electronic and Bass Music**: minor-key loops (i–VI–III–VII and friends), Phrygian and harmonic-minor colour, fifths and power chords, following the root with a bassline, chord stabs, "build a four-chord loop in this key"
5. Later: jazz harmony, pentatonics and blues, reading notation, rhythm

## 10. Review: the flash-card system (`src/srs/`)

- Schedule with **FSRS**, the modern spaced-repetition algorithm (Anki has it built in), through the `ts-fsrs` package. Aim for 90% recall. Ratings come from §5's grading, so there are no "how well did you know this?" buttons except on `sing` cards.
- The Review screen says how many are due today. Sessions are capped (about 20 questions or 5 minutes) and so are new items per day, so a day's review stays short.
- Mixed across types and packs, never the same item twice in a row.
- **Confusions**: when you take A for B, the next sessions add A-vs-B questions until you tell them apart.
- **Stats**: recall per item, weakest items, and a confusion grid (what you hear as what), like Dial In's weakest controls.
- To revisit after testing: FSRS is built for remembering facts. It should still schedule ear skills sensibly, but a rolling accuracy may judge them better.

## 11. Daily challenge

- Same 10 questions for everyone on a date, seeded from the date, no backend. Tiers by pack progress, as in Dial In.
- Score and time, a streak, and a spoiler-free share line with an emoji grid.
- Copy Dial In's `rng.ts` and `daily.ts`, and fingerprint the dailies in a stability test from the first release.

## 12. Explore

- Pick a root and a chord or scale: it lights up on the keyboard and plays. Inversions, and the chords of any key.
- Play notes (on screen or MIDI) and it names the chord, with every reasonable name.
- A circle of fifths you can tap.
- Later: a progression sketchpad (pick numerals in a key and loop them), useful for writing bass music.

## 13. Architecture

```
src/
  theory/      # pure TS: notes, intervals, chords, scales, keys, numerals, chord naming
  audio/       # Web Audio: voice (from Dial In), patches, play note / chord / cadence / progression
  exercises/   # pure TS: one module per question type: generate, check, feedback
  srs/         # pure TS: items, FSRS wrapper, session builder, confusions
  content/     # plain data: schema.ts, packs/
  game/        # rng, pack registry and unlocks, progress, daily, share codes
  storage/     # key-value interface over localStorage, own key prefix
  ui/
    components/  # Keyboard, AnswerGrid, NotePicker, CircleOfFifths, ResultCard, PlayButtons
    screens/     # Start, Home, Learn, LevelSelect, Round, Result, Review, Drill, Daily, Explore, Stats
```

Rules, in the same spirit as Dial In:
- `theory/`, `exercises/` and `srs/` never import React or touch the DOM.
- Every question comes from a seed, so any round can be replayed.
- No magic numbers outside `constants.ts` (small named constants at the top of a module are fine).
- Saved data is versioned.

## 14. Stack

Same as Dial In: TypeScript (strict), Vite, React, the Web Audio API directly, Vitest, vite-plugin-pwa with workbox-window, localStorage behind a small interface, GitHub Pages through GitHub Actions.

New dependencies proposed: `ts-fsrs` (runtime, for scheduling) and `tonal` (dev only, test oracle). Ask before adding anything else.

## 15. Milestones

| # | Milestone | What |
| --- | --- | --- |
| 0 | Set up | Scaffold, SPEC.md and CLAUDE.md from this plan, a Home screen that links to Dial In, PWA shell, deploy workflow. See SETUP.md |
| 1 | Theory engine | Notes, intervals, chords, scales, keys, numerals and naming, with correct spelling. Thorough tests, checked against Tonal |
| 2 | Sound and keyboard | Audio from Dial In, playback helpers, the multi-touch phone keyboard, Explore v1 |
| 3 | Questions | `spell`, `identify`, `hearQuality` and `fact`, the question screen, feedback with A-B, a Drill picker |
| 4 | Packs and Learn | Pack schema and validation, Foundations levels 1–8 with intros, progress, stars, unlocks |
| 5 | Review | Item tracking, FSRS, the daily queue, confusions, Stats |
| 6 | Ear in context | Cadences, `hearDegree`, `hearFunction` and `echo`; Foundations levels 9–12 |
| 7 | Daily | Daily challenge, streaks, share text, stability test |
| 8 | Polish and links | Icons, install and update prompts, an offline check with both apps installed, links between the apps, a phone pass |
| 9+ | More | Chords and Colour, Minor Keys and Modes, Electronic and Bass Music; Web MIDI; fretboard; singing with the microphone; notation; challenge links; progression sketchpad |

Milestone routine (as in Dial In): build it, `npm test` and `npm run build` pass, check it in the browser at phone widths, update SPEC.md, commit. Pushing deploys, so push only when asked.

## 16. Decisions to settle

Settle each at the milestone that needs it. The first option is the recommendation.

1. **Name** (Milestone 0). *Keyed In* pairs with Dial In: both mean "focused", and a key is a musical key. Others: *Tuned In*, *Key Change*, *Chord Sense*. Search the app stores before settling.
2. **Separate app or inside Dial In** (Milestone 0). Separate, as §3 argues.
3. **Sound** (Milestone 2). Synth patches from Dial In (small, works offline), or a sampled piano.
4. **Theory library** (Milestone 1). Our own engine with Tonal as a test oracle, or Tonal at runtime.
5. **Spelling** (Milestone 3). Accept enharmonics at first (D♯ for E♭), and require correct spelling from the key-signature level on.
6. **Notation** (later). None in v1: Hooktheory, Meludia and Ableton all manage without. A pack later.
7. **Second instrument view** (later). Fretboard for guitar and bass, or staff notation first.
8. **Streak** (Milestone 7). Counts a day when you play the daily *or* clear your reviews, or the daily only.
9. **Audience** (Milestone 4). Self-taught producers and players, like Dial In's, or students working through a course.

## 17. Sources

- [10 Great Music Theory and Ear Training Apps (2026)](https://www.musicianwave.com/music-theory-ear-training-apps/), Musician Wave
- [Functional Ear Trainer on the App Store](https://apps.apple.com/app/id1088761926) and [Ear training](https://en.wikipedia.org/wiki/Ear_training), Wikipedia
- [Hooktheory books](https://www.hooktheory.com/books) and [Musical U's Hooktheory review](https://www.musical-u.com/learn/review-hooktheory-music-theory-book)
- [Learn Music for Free in Your Browser](https://ableton.com/en/blog/learn-music-in-your-browser), Ableton, and [Engadget's write-up](https://www.engadget.com/2017-05-08-ableton-interactive-lessons.html)
- [Music Theory Pro](https://apps.apple.com/au/app/id390788573), [Perfect Ear](https://apps.apple.com/app/id1440768353) and [Theta Music Trainer](https://apps.apple.com/app/id791698217) on the App Store
- [ToneGym review](https://jadebultitude.com/ear-training/tonegym/), Jade Bultitude
- [Meludia review](https://symposium.music.org/volume-60-no-1/technology-and-online-resource-reviews-1752877062/meludia-innovative-aural-skills-and-ear-training-exercises-without-staff-notation), College Music Symposium, and [Meludia's method](https://meludia.com/en/method/)
- [Duolingo Music review](https://rocknerd.co.uk/2024/11/12/duolingo-music-review/), Rocknerd, and [Duolingo wants to make music lessons more addictive](https://www.fastcompany.com/91382293/duolingo-wants-to-make-music-lessons-more-addictive), Fast Company
- [Chrome Music Lab](https://www.techlearning.com/news/learning-music-art-science-math-and-more-with-chrome-music-lab), Tech & Learning
- [AP Music Theory teacher-recommended resources](https://apcentral.collegeboard.org/courses/ap-music-theory/classroom-resources/teacher-recommended-resources) and [McGill musicianship guide](https://libraryguides.mcgill.ca/musicianship)
- Wong, Chen and Lim, [Learning melodic musical intervals: to block or to interleave?](https://journals.sagepub.com/doi/10.1177/0305735620922595), *Psychology of Music*
- [Interval and Scale-Degree Strategies in Melodic Perception](https://journals.ou.edu/jmtp/article/view/778), *Journal of Music Theory Pedagogy*, and [Interval recognition](https://en.wikipedia.org/wiki/Interval_recognition), Wikipedia
- [How I use Anki](https://ea.greaterwrong.com/posts/qFqT6akjRvJ3wPJ8t/how-i-use-anki-expanding-the-scope-of-srs/comment/J8JAhBuqGiZBvTuRs) (chord-naming anecdote)
- [ts-fsrs](https://npmjs.com/package/ts-fsrs) and [Tonal](https://npmjs.com/tonal) on npm
