const express = require('express');
const multer = require('multer');
const cors = require('cors');
require('dotenv').config();

const { analyzePhoto, generateGame } = require('./src/gameGenerator');

const app = express();
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 15 * 1024 * 1024 } // 15MB max
});

app.use(cors());
app.use(express.json({ limit: '15mb' }));
app.use(express.static('public'));

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', version: '2.0.0', name: 'Infinite Arcade' });
});

// Main game generation endpoint
app.post('/api/generate', upload.single('photo'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, error: 'No photo uploaded.' });
    }

    const { buffer, mimetype } = req.file;

    // Validate it's an image
    if (!mimetype.startsWith('image/')) {
      return res.status(400).json({ success: false, error: 'File must be an image.' });
    }

    console.log(`[${new Date().toISOString()}] Generating game for ${mimetype} (${Math.round(buffer.length / 1024)}KB)`);

    console.log('Step 1: Analyzing photo with Gemini Vision...');
    const brief = await analyzePhoto(buffer, mimetype);
    console.log(`Step 1 complete: "${brief.gameTitle}" (${brief.gameGenre})`);

    console.log('Step 2: Generating Phaser.js game with Claude...');
    const result = await generateGame(brief);
    console.log('Step 2 complete: Game generated successfully');

    res.json({ success: true, title: brief.gameTitle, tagline: brief.tagline, theme: brief.theme, genre: brief.gameGenre, game: result.html });

  } catch (error) {
    console.error('Generation error:', error.message);
    res.status(500).json({ success: false, error: 'Game generation failed. Please try a different photo.', details: process.env.NODE_ENV === 'development' ? error.message : undefined });
  }
});

app.get('*', (req, res) => { res.sendFile(__dirname + '/public/index.html'); });

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🎮 Infinite Arcade v2.0 running on port ${PORT}`);
  console.log(`   Gemini Vision: ${process.env.GEMINI_API_KEY ? '✅' : '❌ MISSING'}`);
  console.log(`   Claude API:    ${process.env.ANTHROPIC_API_KEY ? '✅' : '❌ MISSING'}`);
});
