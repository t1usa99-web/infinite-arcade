# 🎮 Infinite Arcade v2.0

> Upload any photo. Play your world.

## How It Works

1. User uploads a photo
2. **Gemini Vision** analyzes the photo → builds a custom game brief (subject, colors, genre, characters)
3. **Claude (Anthropic)** generates a complete Phaser.js 3 game from the brief
4. Game runs instantly in the browser — no downloads, no installs

## Tech Stack

- **Backend:** Node.js + Express
- **Vision AI:** Google Gemini 2.0 Flash
- **Code AI:** Anthropic Claude (claude-opus-4-5)
- **Game Engine:** Phaser.js 3.60 (loaded via CDN)
- **Hosting:** Railway
