const fs = require('fs')

// ============================================================
//   🐞 LADYBUG MD - WhatsApp Bot
//   Merged from TKM-bot & BADBOI-v3
//   Powered by @whiskeysockets/baileys
// ============================================================

const {
  smsg, getGroupAdmins, formatp, tanggal, formatDate, getTime, isUrl,
  sleep, clockString, msToDate, sort, toNumber, enumGetKey, runtime,
  fetchJson, getBuffer, jsonformat, delay, format, logic,
  generateProfilePicture, parseMention, getRandom, pickRandom, reSize
} = require('./lib/myfunction')

// ============================================================
//  BOT IDENTITY - Edit these to customise your bot
// ============================================================
global.botname      = "🐞 LADYBUG MD"
global.packname     = "Created By Ladybug-MD"
global.author       = "Ladybug-MD"
global.botVersion   = "1.0.0"

// ============================================================
//  OWNER SETTINGS
// ============================================================
global.owner        = ["263775571820"]   // put your number(s) here (no + sign)
global.ownerName    = "Owner"

// ============================================================
//  CONNECTION SETTINGS
// ============================================================
global.sessionName  = "session"
global.connect      = false   // true = pairing code, false = QR code

// ============================================================
//  FEATURE TOGGLES
// ============================================================
global.welcome      = true
global.autoread     = false
global.anticall     = false
global.autoreadsw   = false
global.owneroff     = false
global.antibug      = true
global.autoStatus   = false   // auto view status

// ============================================================
//  BOT LINKS  (update these)
// ============================================================
global.linkgc       = "https://chat.whatsapp.com/invite/XXXXXXXXX"
global.linktele     = "https://t.me/LadybugMD"

// ============================================================
//  DATABASE SETTINGS  (leave mongo blank to use local JSON)
// ============================================================
global.DATABASE_URL = process.env.MONGODB_URI || ""

// ============================================================
//  API KEYS  (fill in or set as env vars)
// ============================================================
global.api_key      = process.env.API_KEY  || "YOUR_API_KEY"
global.capi_key     = process.env.CAPI_KEY || "YOUR_CAPI_KEY"
global.domain       = process.env.DOMAIN   || "https://api.ladybugmd.xyz"

// ============================================================
//  STANDARD MESSAGES
// ============================================================
global.msg = {
  error:     "⚠️ An error has occurred.",
  done:      "✅ Done!",
  wait:      "⏳ Please wait a moment...",
  group:     "🚫 *Group Only* — This feature is only for groups!",
  private:   "🚫 *Private Only* — This feature is only for private chats!",
  admin:     "🚫 *Admin Only* — This feature is only for group admins!",
  adminbot:  "🚫 *Bot Admin* — Please make me an admin first!",
  owner:     "🚫 *Owner Only* — This feature is only for the bot owner!",
  developer: "🚫 *Developer Only* — This feature is only for developers.",
  premium:   "⭐ *Premium Only* — This feature requires a premium account.",
  limit:     "🎫 You've reached your daily limit. Come back tomorrow!"
}

// ============================================================
//  DECORATION
// ============================================================
global.decor = {
  menut:  '❏═┅═━–〈',
  menub:  '┊ • ',
  menuf:  '┗––––––––––✦',
  hiasan: '꒦꒷꒦꒷꒦꒷꒦꒷꒦꒷꒦꒷꒦꒷꒦',
  htki:   '––––––『',
  htka:   '』––––––',
  haki:   '┅━━━═┅═❏',
  haka:   '❏═┅═━━━┅',
}

// ============================================================
//  RPG EMOTICONS (from BADBOI-v3)
// ============================================================
global.rpg = {
  emoticon(string) {
    string = string.toLowerCase()
    let emot = {
      level: '📊', limit: '🎫', health: '❤️', exp: '✨', atm: '💳',
      money: '💰', bank: '🏦', potion: '🥤', diamond: '💎',
      common: '📦', uncommon: '🛍️', mythic: '🎁', legendary: '🗃️',
      superior: '💼', pet: '🔖', trash: '🗑', armor: '🥼',
      sword: '⚔️', pickaxe: '⛏️', fishingrod: '🎣', wood: '🪵',
      rock: '🪨', string: '🕸️', horse: '🐴', cat: '🐱', dog: '🐶',
      fox: '🦊', robo: '🤖', petfood: '🍖', iron: '⛓️', gold: '🪙',
      emerald: '❇️', upgrader: '🧰'
    }
    return emot[string] || '❓'
  }
}

// ============================================================
//  FILE WATCHER — hot reload on edit
// ============================================================
let file = require.resolve(__filename)
fs.watchFile(file, () => {
  fs.unwatchFile(file)
  delete require.cache[file]
  require(file)
})
