# Setting up the new project

This gets the sibling app from PLAN.md to a first commit, the same way Dial In is set up. The steps use *Keyed In* and the repo name `keyed-in`; swap in the name you pick (PLAN §16).

## What you have

Checked on this machine: Node 22.14, npm 10.9 and Git 2.54, which are all you need. The GitHub CLI (`gh`) isn't installed, so the GitHub steps below use the website.

## 1. Make the folder

Create a folder next to Dial In and put PLAN.md in it:

```
C:\Users\brend\OneDrive\Documents\Gamification\Keyed In\PLAN.md
```

Dial In already lives in OneDrive and works there, so the new app can too. OneDrive will also sync `node_modules` (thousands of small files); if that ever gets slow, move both projects to a folder outside OneDrive, since GitHub is the backup anyway.

## 2. Make the GitHub repo

1. Go to https://github.com/new.
2. Name it `keyed-in`. Make it **Public** (GitHub Pages is free for public repos).
3. Don't add a README, `.gitignore` or licence: the project makes its own, and an empty repo is easiest to push into.
4. In the new repo: **Settings → Pages → Build and deployment → Source: GitHub Actions**.

## 3. Start a Claude Code session in the folder

In the Claude desktop app's Code tab, start a new session and pick the `Keyed In` folder. When it asks to read files in the Dial In folder, allow it: that's where it copies the setup from.

Claude's memory is kept per folder, so the new session won't know how you like to work. The starter prompt below has it write the important parts into the new project's CLAUDE.md.

## 4. Paste the starter prompt

```
This is a new project: a sibling app to my synth ear-training game Dial In
(C:\Users\brend\OneDrive\Documents\Gamification\Dial In, live at
https://brendanauri.github.io/dial-in/). PLAN.md in this folder is the plan.
Read it, then read Dial In's CLAUDE.md, SPEC.md (§3, §4 and §15) and
docs/handoff.md ("Lessons learned") for how I work.

Do Milestone 0 only:

1. Settle the decisions Milestone 0 needs (PLAN §16: the name, and
   confirming it's a separate app) as short multiple-choice questions with
   your recommendation first. The name sets the repo name (keyed-in unless
   I pick another), the localStorage key prefix and the app manifest.
2. git init with main as the default branch. Scaffold with the same stack
   and versions as Dial In (TypeScript strict, Vite, React, Vitest,
   vite-plugin-pwa, workbox-window). Copy and adapt from Dial In:
   tsconfig.json; vite.config.ts (rename DIAL_IN_BASE for this app, new
   manifest name, description and theme colour); .gitignore;
   .claude/launch.json; .github/workflows/deploy.yml (the renamed base
   variable); scripts/make-icons.mjs (a new icon design in the same style);
   the PWA update prompt. Copy nothing else yet: the synth comes over in
   Milestone 2.
3. Write SPEC.md from PLAN.md in the style of Dial In's SPEC (it becomes the
   design source of truth, and PLAN.md can then be deleted), plus a README,
   docs/handoff.md and a CLAUDE.md modelled on Dial In's. CLAUDE.md must
   also say: pushing to main deploys the live site, so push only when I ask;
   the milestone routine; check phone widths (320, 375 and 414 px); I know
   synths and bass music, and I test on Windows and an Android phone; I like
   open questions settled first as multiple choice, and a recommended next
   step at the end of each milestone.
4. A Home screen with the app name, the five modes from PLAN §4 shown as
   "coming soon", and a link to Dial In. Use the app's own localStorage
   prefix: both apps share the brendanauri.github.io origin.
5. npm test and npm run build pass; check Home in the browser pane at phone
   widths; commit. Don't add a remote or push: I'll do that.
```

## 5. Check it locally

```bash
npm run dev
```

Then open http://localhost:5173. Also run:

```bash
npm test
```

```bash
npm run build
```

## 6. Connect to GitHub and deploy

When Milestone 0 looks right, run these in the project folder (or ask the session to; it will ask before pushing):

```bash
git remote add origin https://github.com/BrendanAuri/keyed-in.git
```

```bash
git push -u origin main
```

The push starts the deploy workflow (the repo's **Actions** tab shows it). After a minute or two the site is at https://brendanauri.github.io/keyed-in/. Open it on your Android phone and install it, as you did with Dial In.

## 7. Link the two apps

- The new app's Home links to Dial In from Milestone 0.
- Dial In needs a link back. That's a small change to Dial In's Home, best made once the new site is live so the link isn't dead. Do it in a Dial In session, and push when you're ready.

## 8. After that

Work milestone by milestone, as with Dial In: "Start Milestone 1" in the new session. PLAN §15 lists the milestones and §16 the decisions, each tied to the milestone that needs it.
