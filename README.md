# RUCKUS RUGBY

A complete, playable 2D arcade rugby game for the browser. Build a squad, design your own set plays, pick a game plan and take the field in fast 7-a-side rugby union.

Everything is vanilla HTML, CSS and JavaScript — no build step, no external assets, no network calls. The pitch, players, crowd and audio are all generated in the browser.

## Play it

Open `index.html` through any static web server:

```bash
python3 -m http.server 3000
# then open http://localhost:3000
```

Or serve the folder with any static host. Opening the file directly from disk also works in most browsers, but a local server is recommended for ES modules and save data.

## What is in the game

- **7-a-side rugby union** with tries (5 points), conversions (2), halves, kick-offs, lineouts, scrums, rucks, knock-ons, forward passes, touch and 22 drop-outs.
- **Running, passing, kicking and tackling** — sprint, sidestep, offload in contact and contest the breakdown.
- **Squad Builder** — ten-player squad, six attributes per player, traits and a point budget, plus appearance (skin, hair, hair style, build, headgear) and club identity (name, abbreviation, jersey pattern and colours).
- **Playbook** — five attacking shapes, four defensive systems and a full set-play editor. Drag starting positions, draw running lines, choose the first receiver and equip up to four moves to keys 1–4.
- **Matchday** — four opponents, three difficulties, three weather conditions and three half lengths.
- **Presentation** — broadcast HUD, commentary, minimap, aim/landing indicators, rain and night conditions, procedural sound and a live attract-mode menu scene.
- **Local saves** — your club, squad, tactics, plays and settings persist in `localStorage`.

## Controls

| Action | Keyboard | Touch |
| --- | --- | --- |
| Move | `W` `A` `S` `D` / arrow keys | Drag the left joystick |
| Sprint | `Shift` | SPRINT |
| Pass | `J` or `Z` | PASS |
| Kick | Hold `K` or `X`, release to boot | Hold/release KICK |
| Tackle / dive | `L`, `C` or `Space` | TACKLE |
| Sidestep (carrying) | `L` / `C` / `Space` | STEP |
| Switch defender | `Q` | SWITCH |
| Offload in contact | `E` | — |
| Trigger set play | `1` `2` `3` `4` | Tactics row |
| Pause | `Esc` or `P` | II button |

Kicking is contextual: tap for a grubber, hold for a punt. In open play the aim follows your movement stick. On kick-offs, hold and release to launch. At a lineout or scrum, tap PASS/TACKLE/KICK while the timing bar is in the green zone. At a conversion, stop the power bar in the highlighted window.

## Set plays in 60 seconds

1. Open **Playbook → Set Plays & Moves**.
2. Pick a play or press **+ New**.
3. Click a teammate token, then click upfield to add a run. Drag tokens to move their starting positions.
4. Choose the **First receiver** — they receive an automatic pass when the move starts.
5. Use **Undo point**, **Clear run** or **Reset shape** to tidy up.
6. Assign plays to **Matchday Keys 1–4** with the dropdowns.
7. In a match, press `1`–`4` (or tap the tactic buttons) while your team has the ball. Teammates break to their lines and the first receiver gets the ball automatically.

## Project layout

| File | Purpose |
| --- | --- |
| `index.html` | Screens, HUD, touch controls and modal shell |
| `styles.css` | Responsive broadcast-style visual system |
| `src/main.js` | Bootstrap, match lifecycle and fixed-step render loop |
| `src/engine.js` | Simulation: rules, AI, rucks, set pieces, plays, scoring |
| `src/renderer.js` | Canvas stadium, pitch, players, effects and camera |
| `src/ui.js` | Screen routing, builders, playbook editor and HUD |
| `src/data.js` | Default squads, opponents, attributes, tactics and plays |
| `src/storage.js` | Versioned, sanitised `localStorage` saves |
| `src/input.js` | Keyboard and touch input |
| `src/audio.js` | Procedural WebAudio crowd and effects |
| `src/utils.js` | Shared math, formatting and helper functions |

## Notes and assumptions

- The game is an **arcade interpretation** of rugby union, tuned for 7-a-side and short sessions. It is not a referee-accurate simulation.
- Default halves are **3 minutes**; match setup can switch to 1:30 or 5:00.
- The squad has **ten players** (seven starters plus three bench) and each player has a **46-point attribute budget** across their six attributes.
- Set plays are authored against a 6-teammate shape relative to the ball carrier, so the same design adapts to either direction of play.
- All art and audio are procedural; there are no external asset downloads, fonts or network dependencies.
- Saves are per-browser/device. Use **Settings → Delete save** to start fresh.
- The repository intentionally has **no package manager or build step**. Serve the files as-is.

## QA checklist

- Menu, setup, squad builder, playbook, help and settings screens.
- Kick-off, open play, contact, rucks, lineouts, scrums, tries, conversions, half-time and full-time.
- Custom plays: drag/draw/duplicate/delete, equip to keys, auto first pass in a match.
- Keyboard and touch control paths, pause/restart/quit, mobile portrait layout and safe areas.
