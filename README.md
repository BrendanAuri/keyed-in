# Keyed In

A game for learning chords, scales and the theory behind them, from the very beginning: see a chord's name and build it on the keyboard, see keys and name them, hear a chord and say what it is or play it back. Tools alongside it find the scales a set of notes fits and show the chords of any scale and how they feel. Runs in the browser on desktop and mobile and installs as an offline-capable app (PWA). A sibling of [Dial In](https://brendanauri.github.io/dial-in/).

See [SPEC.md](SPEC.md) for the full design, and [docs/handoff.md](docs/handoff.md) for where things stand and what's next.

## Run it

```bash
npm install
npm run dev        # http://localhost:5174
npm test           # unit tests
npm run build      # production build in dist/
npm run preview    # serve the build at http://localhost:4174 (service worker included)
npm run icons      # redraw the app icons in public/
```

## Deploy

It's a static site, so any static host works.

- **GitHub Pages**: in the GitHub repo, Settings → Pages → Source: GitHub Actions. [.github/workflows/deploy.yml](.github/workflows/deploy.yml) tests, builds and publishes on every push to `main`, under `/<repo-name>/`.

Building for a sub-path elsewhere: set `KEYED_IN_BASE=/path/` when running `npm run build`. In Git Bash on Windows, add `MSYS_NO_PATHCONV=1` so the path isn't turned into a Windows path.
