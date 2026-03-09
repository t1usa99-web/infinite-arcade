const { GoogleGenerativeAI } = require('@google/generative-ai');
const Anthropic = require('@anthropic-ai/sdk');

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

// STEP 1: Gemini Vision analyzes the photo and returns structured game brief
async function analyzePhoto(imageBuffer, mimeType) {
  const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });

  const prompt = `Analyze this image and return a JSON game brief. Be creative and fun.

Return ONLY valid JSON, no markdown, no explanation:
{
  "gameTitle": "A clever punny game title based on the image (max 4 words)",
  "tagline": "A short punchy tagline (max 8 words)",
  "playerCharacter": "What the player controls (derived from main subject)",
  "enemies": "What the player fights or avoids (thematically related)",
  "collectibles": "What the player collects for points",
  "gameGenre": "One of: SHOOTER, RUNNER, PLATFORMER, CATCHER, AVOIDER",
  "primaryColor": "Dominant hex color from image (e.g. #FF4500)",
  "secondaryColor": "Secondary hex color (e.g. #FFD700)",
  "accentColor": "Bright accent hex color (e.g. #00FFFF)",
  "backgroundColor": "Dark background hex color (e.g. #0A0A1A)",
  "theme": "2-3 word theme description",
  "specialMechanic": "One unique fun mechanic that fits the theme",
  "worldDescription": "Brief description of the game world/environment"
}`;

  const result = await model.generateContent([
    prompt,
    { inlineData: { mimeType, data: imageBuffer.toString('base64') } }
  ]);

  const text = result.response.text().trim();

  // Strip markdown code fences if present
  const cleaned = text.replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/```\s*$/i, '').trim();

  try {
    return JSON.parse(cleaned);
  } catch (e) {
    // Fallback brief if parsing fails
    return {
      gameTitle: "Pixel Blaster",
      tagline: "Shoot everything. Score big.",
      playerCharacter: "A glowing spaceship",
      enemies: "Pixel invaders",
      collectibles: "Stars",
      gameGenre: "SHOOTER",
      primaryColor: "#7B2FBE",
      secondaryColor: "#00D4FF",
      accentColor: "#FF2D55",
      backgroundColor: "#0A0A1A",
      theme: "Space shooter",
      specialMechanic: "Charge shot by holding fire",
      worldDescription: "Deep space with asteroid fields"
    };
  }
}

// STEP 2: Claude generates a complete, polished Phaser.js game from the brief
async function generateGame(brief) {
  const genreInstructions = {
    SHOOTER: `
      - Player ship at bottom, moves left/right with arrow keys or A/D
      - Enemies spawn from top and move downward in patterns
      - Player fires upward with spacebar or tap
      - Enemies fire back occasionally as difficulty increases
      - Boss enemy every 500 points`,
    RUNNER: `
      - Player auto-runs right, camera follows
      - Tap/space to jump, double-tap for double jump
      - Obstacles spawn from right side
      - Collectibles floating in air
      - Speed increases over time`,
    PLATFORMER: `
      - Player jumps between platforms using left/right/up or WASD
      - Enemies patrol platforms
      - Collectibles on hard-to-reach platforms
      - Platforms at varying heights
      - Gravity and proper jump arc`,
    CATCHER: `
      - Player paddle/basket at bottom moves left/right
      - Good items fall from top - catch for points
      - Bad items fall from top - avoid for lives
      - Items fall faster over time
      - Combos for catching consecutive good items`,
    AVOIDER: `
      - Player at center, moves in all directions
      - Enemies/projectiles come from all edges
      - Survival time = score
      - Safe zones appear briefly
      - Enemy count and speed increase over time`
  };

  const instructions = genreInstructions[brief.gameGenre] || genreInstructions.SHOOTER;

  const prompt = `You are a senior Phaser.js 3 game developer known for writing visually stunning, juice-filled browser games. Create a complete, polished game based on this brief. The visual quality target is a modern indie browser game — smooth, vibrant, and satisfying to play.

═══════════════════════════════
GAME BRIEF
═══════════════════════════════
Title:          "${brief.gameTitle}"
Tagline:        "${brief.tagline}"
Theme:          ${brief.theme}
Player:         ${brief.playerCharacter}
Enemies:        ${brief.enemies}
Collectibles:   ${brief.collectibles}
Genre:          ${brief.gameGenre}
Special:        ${brief.specialMechanic}
World:          ${brief.worldDescription}
Primary:        ${brief.primaryColor}
Secondary:      ${brief.secondaryColor}
Accent:         ${brief.accentColor}
Background:     ${brief.backgroundColor}

═══════════════════════════════
TECHNICAL REQUIREMENTS
═══════════════════════════════
- Single self-contained HTML file, no external assets whatsoever
- Load Phaser 3.60 ONLY from: https://cdn.jsdelivr.net/npm/phaser@3.60.0/dist/phaser.min.js
- Canvas: 480 × 640px
- All graphics: Phaser.GameObjects.Graphics drawn procedurally
- Audio: Web Audio API only (AudioContext oscillators — no files)

═══════════════════════════════
GENRE GAMEPLAY — ${brief.gameGenre}
═══════════════════════════════
${instructions}

═══════════════════════════════
REQUIRED SCENES
═══════════════════════════════
TITLE SCENE:
  - Animated background (particles, scrolling elements, or pulsing shapes)
  - Game title in large styled text with a glow/shadow effect
  - Tagline in smaller text
  - "TAP TO START" pulsing with a sine-wave alpha tween
  - Brief animated preview of the player sprite idling

GAME SCENE:
  - Full gameplay (see genre instructions above)
  - HUD: score (top-left), lives as icon-row (top-right), combo multiplier when active
  - Floating damage/score text: when scoring points, spawn a "+100" text that floats upward and fades (use Phaser.GameObjects.Text with a tween)
  - Combo counter that appears and pulses when player is on a streak

GAMEOVER SCENE:
  - Stylised "GAME OVER" title with entrance animation
  - Final score and all-time high score displayed
  - High score saved to localStorage key: "ia_${brief.gameTitle.replace(/\s+/g,'_').toLowerCase()}_hs"
  - "PLAY AGAIN" button with hover glow effect
  - Brief replay of death animation or particle burst

═══════════════════════════════
GAMEPLAY SYSTEMS
═══════════════════════════════
- Progressive difficulty: increase speed + spawn rate every 100 points or 30 seconds
- Combo system: consecutive hits/catches multiply points (x2, x3, x4…). Reset on miss/hit.
- Touch/click controls mirroring all keyboard controls
- Special mechanic active: "${brief.specialMechanic}"

═══════════════════════════════
VISUAL QUALITY — THIS IS THE MOST IMPORTANT SECTION
═══════════════════════════════
You MUST implement ALL of the following rendering techniques. Do not skip any.

1. MULTI-LAYER SPRITES (required for player AND enemies):
   Draw every sprite using at least 3 stacked graphics layers:
   - Layer 1 (shadow/base): Large shape at ~30% alpha, 2-4px larger than core
   - Layer 2 (core body): Main shape in primaryColor/secondaryColor, fully opaque
   - Layer 3 (highlight): Small bright shape (white or light tint) at top-left of sprite at ~60% alpha, simulating a light source
   Example: a circular enemy → outer glow circle (alpha 0.3, +6px), solid circle (full), small white oval top-left (alpha 0.6)

2. GLOW EFFECTS (required on player, projectiles, and collectibles):
   Simulate glow by drawing 3–5 concentric shapes outward from the object center,
   each step larger by 4–6px and lower alpha (e.g. 0.5, 0.3, 0.15, 0.05).
   Use the accentColor (${brief.accentColor}) for glows on player and collectibles.

3. PARALLAX BACKGROUND (required, minimum 3 layers):
   - Layer 0 (slowest, ~10% speed): Large geometric shapes or distant objects, very low opacity (0.08–0.15)
   - Layer 1 (medium, ~30% speed): Medium decorative elements related to the theme at 0.2–0.35 opacity
   - Layer 2 (fastest, ~70% speed): Small foreground details, slightly more visible
   All layers scroll continuously using scene update(). Wrap/reset when off-screen.

4. PLAYER TRAIL EFFECT:
   Every frame, spawn a fading ghost of the player at the previous position.
   Use a Graphics object pool of 6–8 objects; each ghost decreases in alpha (0.4 → 0) and scale (1.0 → 0.5) over 200ms using tweens.
   Color: a lighter/more transparent version of primaryColor.

5. SCREEN JUICE (required on these events):
   - Player takes damage: camera.shake(200, 0.015) + brief red flash overlay (Rectangle, red, alpha 0.4, tween to 0 over 300ms)
   - Enemy destroyed: explosion particle burst (8–12 particles, outward velocity, fade to 0 over 400ms) + brief white flash at position
   - Collectible picked up: ring-expand effect (circle that grows outward and fades) in accentColor
   - Score milestone (every 500pts): camera.flash(300) in a light color

6. PARTICLE SYSTEMS:
   Use Phaser's built-in particle emitter for:
   - Continuous engine/exhaust trail on the player (small, fast, fading particles in a warm color)
   - Explosion burst on enemy death (8 particles, gravity, fade)
   - Sparkle on collectible pickup (6 particles, spread outward)

7. ANIMATED SPRITES:
   All idle sprites must have a continuous tween:
   - Player: gentle bob (y ±3px, 1200ms, yoyo, loop) + slight rotation (±2°, 1800ms, yoyo, loop)
   - Enemies: scale pulse (1.0→1.08, 900ms, yoyo, loop) with slight rotation
   - Collectibles: rotation (360° per 2000ms, loop) + bob (y ±4px, 1000ms, yoyo)

8. UI POLISH:
   - Score text: white, fontSize 26px, stroke: accentColor (${brief.accentColor}), strokeThickness 3
   - All UI text must have entrance tweens (slide in from edge or fade+scale from 0.5→1)
   - Buttons: rounded rectangle background + text, glow on hover (pointer events)
   - Lives display: draw actual themed icons (small versions of player sprite), not just text

9. BACKGROUND DETAIL:
   The background must NOT be a flat color. Use a vertical gradient:
   Draw multiple horizontal rectangles from top to bottom, shifting from backgroundColor to a slightly lighter/more saturated version. Minimum 8 gradient steps.

═══════════════════════════════
AUDIO (Web Audio API)
═══════════════════════════════
Create a simple AudioContext and generate these sounds procedurally:
- Shoot: short sine wave burst (220Hz, 80ms, quick fade)
- Hit enemy: sawtooth noise burst (150Hz, 120ms)
- Player hurt: descending tone (400→880Hz, 150ms)
- Game over: slow descending chord (300ms)
Keep all volumes low (~0.15 gain). Gate audio start on first user interaction.

═══════════════════════════════
CODE QUALITY
═══════════════════════════════
- Use Phaser scene classes (not config functions) for clean structure
- Define color constants at the top: const COL = { primary: '${brief.primaryColor}', ... }
- Helper function: drawGlow(graphics, x, y, radius, color, layers=4) — reuse across sprites
- Helper function: spawnFloatingText(scene, x, y, text, color) — for score popups
- All magic numbers as named constants at top of each scene
- No console errors — guard all destroy/kill calls

OUTPUT: Return ONLY the raw HTML file. No markdown fences, no explanation, no comments outside the code. Begin with <!DOCTYPE html> and end with </html>.`;

  const message = await anthropic.messages.create({
    model: 'claude-opus-4-5',
    max_tokens: 16000,
    messages: [{ role: 'user', content: prompt }]
  });

  let gameHtml = message.content[0].text.trim();

  // Strip any markdown code blocks just in case
  gameHtml = gameHtml.replace(/^```html\s*/i, '').replace(/^```\s*/i, '').replace(/```\s*$/i, '').trim();

  return { html: gameHtml, brief };
}

module.exports = { analyzePhoto, generateGame };
