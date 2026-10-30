# Water Quest – charity: water React App

An interactive web game built in React, TypeScript, and Vite celebrating charity: water's mission. Players tap the signature yellow jerry cans across a 3x3 grid to collect 20 cans before the 30-second countdown expires.

## Features

- **Dynamic Game Grid**: Interactive 9-cell grid with animated yellow jerry can pop-ups.
- **Accurate Scoring & Penalty System**:
  - +1 point for each successfully tapped jerry can.
  - -1 penalty for tapping an empty tile or missing a can before it moves (score never drops below 0).
- **30-Second Round Countdown**: Real-time timer with automatic end-of-round evaluation.
- **Victory & Defeat States**:
  - Contextual end-game feedback choosing from randomized win and retry messages.
  - Win condition: collecting 20 or more cans.
  - Celebratory animated confetti shower upon winning.
- **charity: water Branding**: Official brand guidelines palette, typography, responsive card layout, and logos.
- **Accessibility**: Keyboard navigable (Enter / Space activation), ARIA live region announcements, and reduced-motion support.

## Getting Started

### Development
```bash
npm run dev
```

### Build
```bash
npm run build
```
