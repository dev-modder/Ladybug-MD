# 🐞 Ladybug MD — WhatsApp Multi-Device Bot

<p align="center">
  <img src="https://i.ibb.co/SmL6cGC/ladybug-default.jpg" width="120" />
  <br/>
  <b>Ladybug MD</b> — A powerful WhatsApp bot built with Baileys MD
</p>

---

## ✨ Features

- 🐞 **Ladybug MD** branding — clean, fast, modern
- 🔗 **Baileys Multi-Device** — no WhatsApp Web required on your phone
- 🎵 YouTube audio/video download (`ytmp3`, `ytmp4`, `play`)
- 🎨 Sticker maker (`sticker`, `attp`, `smeme`)
- 📥 TikTok, Instagram, MediaFire downloader
- 🤖 AI tools: GPT, DarkGPT, txt2img, Remini HD, DeepImg
- 🔒 Group tools: antilink, antiasing, antivirtex, antitoxic
- 👑 Admin tools: kick, add, promote, demote, bcgc, open/close
- 🎮 Games: tebak-tebakan, tebak lagu, tebak bendera, tebak gambar, tictactoe
- 📊 RPG system: level, exp, atm, bank, berkebon, berburu, berdagang
- 🌤️ Weather, Wikipedia, Translate, TTS
- 🛡️ AntiCall, welcome/leave messages, autotyping, autoread
- 💎 Premium user system
- 🔄 Hot-reload (files auto-restart on edit)
- ☁️ MongoDB support (optional, falls back to local JSON)
- 🚀 Deploy anywhere: Heroku, Railway, VPS, Render

---

## 🚀 Quick Start

### Requirements
- Node.js >= 18
- ffmpeg installed (`sudo apt install ffmpeg`)
- Git

### Installation

```bash
git clone https://github.com/YourUsername/Ladybug-MD.git
cd Ladybug-MD
npm install
```

### Configuration

Edit `config.js`:
```js
global.owner     = ["your_number_without_+"]
global.botname   = "🐞 LADYBUG MD"
global.sessionName = "session"
global.connect   = false   // false = QR code | true = pairing code
```

### Run

```bash
# QR Code (default)
node index.js

# Pairing Code
node index.js --connect=true
```

Scan the QR or enter the pairing code in WhatsApp → Linked Devices → Link a Device.

---

## 📋 Commands

> Default prefix: `.`

| Category | Commands |
|----------|----------|
| **Info** | `.menu`, `.ping`, `.runtime`, `.owner`, `.sc` |
| **Downloader** | `.ytmp3`, `.ytmp4`, `.play`, `.tiktok`, `.tiktokmp3`, `.igdlmp4`, `.igdlimage`, `.mediafire` |
| **Sticker** | `.sticker`, `.attp`, `.toimage`, `.smeme` |
| **AI / Tools** | `.gpt`, `.darkgpt`, `.remini`, `.txt2img`, `.diffusion`, `.weather`, `.wiki`, `.translate`, `.tts` |
| **Group Admin** | `.kick`, `.add`, `.promote`, `.demote`, `.open`, `.close`, `.bcgc`, `.antilink`, `.antivirtex` |
| **Games** | `.tebakkata`, `.tebakbendera`, `.tebak lagu`, `.tictactoe`, `.math` |
| **RPG** | `.profil`, `.level`, `.atm`, `.bank`, `.berkebon`, `.berburu`, `.berdagang` |
| **Owner** | `.addprem`, `.delprem`, `.addowner`, `.restart`, `.broadcast` |

---

## ⚙️ Deploy to Railway / Render

1. Push repo to GitHub
2. Connect Railway/Render to the repo  
3. Set env var `MONGODB_URI` (optional)
4. Start command: `node index.js`

---

## 🙏 Credits

- **[Cod3Uchiha](https://github.com/Cod3Uchiha)** — TKM-bot base
- **[thezetsuboxygen](https://github.com/whatsappxyz)** — BADBOI-v3 commands
- **[@whiskeysockets/baileys](https://github.com/WhiskeySockets/Baileys)** — WhatsApp library

---

<p align="center">Made with ❤️ — Ladybug MD</p>
