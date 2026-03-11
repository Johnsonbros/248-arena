# 248 Arena — MA Journeyman Plumbing Exam Study App

**Enter the Arena. Master the Code. Pass the Exam.**

Built by Johnson Bros. Plumbing — brothers who passed the exam and know what it takes. This app is built specifically for the Massachusetts Journeyman Plumbing Exam (248 CMR). Nothing else.

## Features

- **65+ exam questions** across 11 categories, accurate to 248 CMR
- **6 game modes:** Practice, Ranked, Exam Sim, Code Royale, Speed Run, Imposter
- **Searchable Code Book** — 248 CMR organized by section with key tables and sizing charts
- **Leaderboard** — Weekly/Monthly/All-Time with Top 10 + full rankings
- **XP, Levels, Badges** — Battle Pass progression system
- **The Examiner** — AI study chat for quick Q&A
- **Sponsor page** with donation support
- **Avatar customization** and arena-themed UI

## File Structure

```
projects/plumber-exam-app/
├── index.html          Landing page + login (248 Arena branded)
├── app.html            Main app with all game modes
├── codebook.html       248 CMR code book viewer with search
├── sponsors.html       Sponsor/donation page
├── css/
│   └── styles.css      Arena theme (dark + neon accents)
├── js/
│   ├── app.js          Main app logic
│   ├── questions.js    Question bank (65+ questions)
│   ├── game-modes.js   All game mode logic
│   ├── leaderboard.js  Top 10 + pagination
│   ├── codebook.js     Code book search/highlight
│   └── auth.js         SMS login UI + cookie persistence
└── README.md
```

## Tech

- Pure HTML/CSS/JS — no build tools, no dependencies, no frameworks
- localStorage for persistence (no backend required)
- Works offline after first load
- Responsive design (mobile-first)

## Design

Arena/fighting game aesthetic:
- Dark background (#0a0a0f) with neon accents (blue #00d4ff, orange #ff6b2b, green #00ff88)
- Orbitron display font + Rajdhani headings + Inter body text
- CSS animations on correct/wrong answers
- Progress bars styled as water-filling pipes
- Glowing badge unlocks

## v2 Changes (from v1 "PipeMaster Pro")

- Complete rebrand to "248 Arena"
- Arena/fighting game aesthetic redesign
- Added Code Book (codebook.html) with searchable 248 CMR reference
- Added Sponsors page with donation section and Class Mode teaser
- Leaderboard: Top 10 default + "See Full Rankings" pagination
- Avatar selection on signup
- AI chat renamed to "The Examiner"
- Code references link directly to Code Book sections
- SVG icons throughout (no external dependencies)
- All v1 features preserved (6 game modes, 65+ questions, XP/badges/streaks)

## License

© 2026 Johnson Bros. Plumbing. All rights reserved.
