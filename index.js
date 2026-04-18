// ============================================================
//
//   🐞 LADYBUG MD — WhatsApp Bot
//   ━━━━━━━━━━━━━━━━━━━━━━━━━━━
//   Merged & Rebranded from:
//     • TKM-bot  by Cod3Uchiha
//     • BADBOI-v3 by thezetsuboxygen
//
//   Powered by @whiskeysockets/baileys (Multi-Device)
//   Node.js >= 18 required
//
// ============================================================

require('./config')

const {
  default: LadybugConnect,
  makeWASocket,
  useMultiFileAuthState,
  fetchLatestBaileysVersion,
  generateForwardMessageContent,
  generateWAMessageFromContent,
  downloadContentFromMessage,
  makeInMemoryStore,
  jidDecode,
  proto,
  DisconnectReason,
  getAggregateVotesInPollMessage
} = require('@whiskeysockets/baileys')

const pino     = require('pino')
const chalk    = require('chalk')
const { Boom } = require('@hapi/boom')
const fs       = require('fs')
const FileType = require('file-type')
const path     = require('path')
const _        = require('lodash')
const PhoneNumber = require('awesome-phonenumber')
const { spawn }   = require('child_process')
const CFonts      = require('cfonts')
const moment      = require('moment-timezone')
const readline    = require('readline')
const yargs       = require('yargs/yargs')
const NodeCache   = require('node-cache')
const axios       = require('axios')

var low
try { low = require('lowdb') } catch (e) { low = require('./lib/lowdb') }
const { Low, JSONFile } = low
const mongoDB = require('./lib/mongoDB')

const { imageToWebp, videoToWebp, writeExifImg, writeExifVid } = require('./lib/exif')
const { smsg, isUrl, generateMessageTag, getBuffer, getSizeMedia, fetchJson, sleep } = require('./lib/myfunction')
const { color } = require('./lib/color')
const { toPTT, toAudio } = require('./lib/converter')

// ──────────────────────────────────────────
//  CLI colours
// ──────────────────────────────────────────
const listcolor   = ['red', 'blue', 'magenta', 'cyan', 'green']
const randomcolor = listcolor[Math.floor(Math.random() * listcolor.length)]

const usePairingCode = global.connect

// ──────────────────────────────────────────
//  Interactive phone-number prompt (pairing)
// ──────────────────────────────────────────
const question = (text) => {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout })
  return new Promise(resolve => {
    rl.question(color(text, randomcolor), answer => { resolve(answer); rl.close() })
  })
}

// ──────────────────────────────────────────
//  MAIN CONNECT FUNCTION
// ──────────────────────────────────────────
async function LadybugStart() {
  const store = makeInMemoryStore({ logger: pino().child({ level: 'silent', stream: 'store' }) })
  const { state, saveCreds } = await useMultiFileAuthState(`./${global.sessionName}`)
  const { version, isLatest } = await fetchLatestBaileysVersion()
  const resolveMsgBuffer = new NodeCache()

  const Ladybug = LadybugConnect({
    isLatest,
    keepAliveIntervalMs: 50000,
    printQRInTerminal: !usePairingCode,
    logger: pino({ level: 'fatal' }),
    auth: state,
    browser: ['Ubuntu', 'Chrome', '121.0.6167.159'],
    version: [2, 2413, 1],
    generateHighQualityLinkPreview: true,
    resolveMsgBuffer
  })

  store.bind(Ladybug.ev)

  // ── Pairing code prompt ──────────────────
  if (usePairingCode && !Ladybug.authState.creds.registered) {
    CFonts.say('LADYBUG\nMD', {
      font: 'block',
      align: 'center',
      gradient: [randomcolor, 'white']
    })
    CFonts.say(`Bot Version: ${global.botVersion}\nPowered by Baileys MD`, {
      font: 'console',
      align: 'center',
      gradient: [randomcolor, randomcolor]
    })
    const phoneNumber = await question('🐞 Enter your WhatsApp number (without +):\n➤ Example: 263775571820\n➤ Number: ')
    const code = await Ladybug.requestPairingCode(phoneNumber.trim())
    console.log(color(`\n🐞 Your pairing code: ${code}\n   Enter it in WhatsApp → Linked Devices → Link a Device\n`, randomcolor))
  }

  Ladybug.public = true

  // ── Database setup ───────────────────────
  global.opts = new Object(yargs(process.argv.slice(2)).exitProcess(false).parse())
  global.db = new Low(
    /https?:\/\//.test(opts['db'] || '') ? new (require('./lib/cloudDBAdapter'))(opts['db']) :
    /mongodb/.test(opts['db'] || '')     ? new mongoDB(opts['db']) :
    new JSONFile('./dtbs/database.json')
  )
  global.DATABASE = global.db
  global.loadDatabase = async function loadDatabase() {
    if (global.db.READ)
      return new Promise(resolve =>
        setInterval(function () {
          if (!global.db.READ) { clearInterval(this); resolve(global.db.data == null ? global.loadDatabase() : global.db.data) }
        }, 1000)
      )
    if (global.db.data !== null) return
    global.db.READ = true
    await global.db.read()
    global.db.READ = false
    global.db.data = {
      users: {}, chats: {}, game: {}, database: {}, settings: {},
      setting: {}, others: {}, sticker: {}, ...(global.db.data || {})
    }
    global.db.chain = _.chain(global.db.data)
  }
  loadDatabase()

  if (global.db) setInterval(async () => {
    if (global.db.data) await global.db.write()
  }, 30 * 1000)

  // ── Helper methods ───────────────────────
  Ladybug.decodeJid = (jid) => {
    if (!jid) return jid
    if (/:\d+@/gi.test(jid)) {
      let decode = jidDecode(jid) || {}
      return decode.user && decode.server ? decode.user + '@' + decode.server : jid
    }
    return jid
  }

  Ladybug.getName = (jid, withoutContact = false) => {
    const id = Ladybug.decodeJid(jid)
    if (id.endsWith('@g.us'))
      return new Promise(async resolve => {
        let v = store.contacts[id] || {}
        if (!(v.name || v.subject)) v = await Ladybug.groupMetadata(id) || {}
        resolve(v.name || v.subject || PhoneNumber('+' + id.replace('@s.whatsapp.net', '')).getNumber('international'))
      })
    let v = id === '0@s.whatsapp.net' ? { id, name: 'WhatsApp' } :
            id === Ladybug.decodeJid(Ladybug.user.id) ? Ladybug.user :
            (store.contacts[id] || {})
    return (withoutContact ? '' : v.name) || v.subject || v.verifiedName ||
           PhoneNumber('+' + jid.replace('@s.whatsapp.net', '')).getNumber('international')
  }

  Ladybug.setStatus = (status) => Ladybug.query({
    tag: 'iq',
    attrs: { to: '@s.whatsapp.net', type: 'set', xmlns: 'status' },
    content: [{ tag: 'status', attrs: {}, content: Buffer.from(status, 'utf-8') }]
  })

  Ladybug.sendContact = async (jid, kon, quoted = '', opts = {}) => {
    let list = []
    for (let i of kon) {
      list.push({
        displayName: await Ladybug.getName(i),
        vcard: `BEGIN:VCARD\nVERSION:3.0\nN:${await Ladybug.getName(i)}\nFN:${await Ladybug.getName(i)}\nitem1.TEL;waid=${i.split('@')[0]}:${i.split('@')[0]}\nitem1.X-ABLabel:Ponsel\nEND:VCARD`
      })
    }
    return Ladybug.sendMessage(jid, { contacts: { displayName: `${list.length} Contact(s)`, contacts: list }, ...opts }, { quoted })
  }

  Ladybug.serializeM = (m) => smsg(Ladybug, m, store)

  // ── send helpers ────────────────────────
  Ladybug.sendText = (jid, text, quoted = '', options) =>
    Ladybug.sendMessage(jid, { text, ...options }, { quoted, ...options })

  Ladybug.sendTextWithMentions = async (jid, text, quoted, options = {}) =>
    Ladybug.sendMessage(jid, { text, mentions: [...text.matchAll(/@(\d{0,16})/g)].map(v => v[1] + '@s.whatsapp.net'), ...options }, { quoted })

  Ladybug.sendImage = async (jid, path, caption = '', quoted = '', options) => {
    let buffer = Buffer.isBuffer(path) ? path :
      /^data:.*?\/.*?;base64,/i.test(path) ? Buffer.from(path.split`,`[1], 'base64') :
      /^https?:\/\//.test(path) ? await getBuffer(path) :
      fs.existsSync(path) ? fs.readFileSync(path) : Buffer.alloc(0)
    return Ladybug.sendMessage(jid, { image: buffer, caption, ...options }, { quoted })
  }

  Ladybug.sendVideo = async (jid, path, caption = '', quoted = '', gif = false, options) => {
    let buffer = Buffer.isBuffer(path) ? path :
      /^data:.*?\/.*?;base64,/i.test(path) ? Buffer.from(path.split`,`[1], 'base64') :
      /^https?:\/\//.test(path) ? await getBuffer(path) :
      fs.existsSync(path) ? fs.readFileSync(path) : Buffer.alloc(0)
    return Ladybug.sendMessage(jid, { video: buffer, caption, gifPlayback: gif, ...options }, { quoted })
  }

  Ladybug.sendAudio = async (jid, path, quoted = '', ptt = false, options) => {
    let buffer = Buffer.isBuffer(path) ? path :
      /^data:.*?\/.*?;base64,/i.test(path) ? Buffer.from(path.split`,`[1], 'base64') :
      /^https?:\/\//.test(path) ? await getBuffer(path) :
      fs.existsSync(path) ? fs.readFileSync(path) : Buffer.alloc(0)
    return Ladybug.sendMessage(jid, { audio: buffer, ptt, ...options }, { quoted })
  }

  Ladybug.sendPoll = (jid, name = '', values = [], selectableCount = 1) =>
    Ladybug.sendMessage(jid, { poll: { name, values, selectableCount } })

  Ladybug.sendImageAsSticker = async (jid, path, quoted, options = {}) => {
    let buff = Buffer.isBuffer(path) ? path :
      /^data:.*?\/.*?;base64,/i.test(path) ? Buffer.from(path.split`,`[1], 'base64') :
      /^https?:\/\//.test(path) ? await getBuffer(path) :
      fs.existsSync(path) ? fs.readFileSync(path) : Buffer.alloc(0)
    let buffer = (options.packname || options.author) ? await writeExifImg(buff, options) : await imageToWebp(buff)
    await Ladybug.sendMessage(jid, { sticker: { url: buffer }, ...options }, { quoted })
    return buffer
  }

  Ladybug.sendVideoAsSticker = async (jid, path, quoted, options = {}) => {
    let buff = Buffer.isBuffer(path) ? path :
      /^data:.*?\/.*?;base64,/i.test(path) ? Buffer.from(path.split`,`[1], 'base64') :
      /^https?:\/\//.test(path) ? await getBuffer(path) :
      fs.existsSync(path) ? fs.readFileSync(path) : Buffer.alloc(0)
    let buffer = (options.packname || options.author) ? await writeExifVid(buff, options) : await videoToWebp(buff)
    await Ladybug.sendMessage(jid, { sticker: { url: buffer }, ...options }, { quoted })
    return buffer
  }

  Ladybug.sendFileUrl = async (jid, url, caption, quoted, options = {}) => {
    let res = await axios.head(url)
    let mime = res.headers['content-type']
    if (mime.split('/')[1] === 'gif')
      return Ladybug.sendMessage(jid, { video: await getBuffer(url), caption, gifPlayback: true, ...options }, { quoted, ...options })
    if (mime === 'application/pdf')
      return Ladybug.sendMessage(jid, { document: await getBuffer(url), mimetype: 'application/pdf', caption, ...options }, { quoted, ...options })
    if (/image/.test(mime))
      return Ladybug.sendMessage(jid, { image: await getBuffer(url), caption, ...options }, { quoted, ...options })
    if (/video/.test(mime))
      return Ladybug.sendMessage(jid, { video: await getBuffer(url), caption, mimetype: 'video/mp4', ...options }, { quoted, ...options })
    if (/audio/.test(mime))
      return Ladybug.sendMessage(jid, { audio: await getBuffer(url), caption, mimetype: 'audio/mpeg', ...options }, { quoted, ...options })
  }

  Ladybug.downloadAndSaveMediaMessage = async (message, filename, attachExtension = true) => {
    let quoted = message.msg ? message.msg : message
    let mime = (message.msg || message).mimetype || ''
    let messageType = message.mtype ? message.mtype.replace(/Message/gi, '') : mime.split('/')[0]
    const stream = await downloadContentFromMessage(quoted, messageType)
    let buffer = Buffer.from([])
    for await (const chunk of stream) buffer = Buffer.concat([buffer, chunk])
    let type = await FileType.fromBuffer(buffer)
    let trueFileName = attachExtension ? (filename + '.' + type.ext) : filename
    fs.writeFileSync(trueFileName, buffer)
    return trueFileName
  }

  Ladybug.downloadMediaMessage = async (message) => {
    let mime = (message.msg || message).mimetype || ''
    let messageType = message.mtype ? message.mtype.replace(/Message/gi, '') : mime.split('/')[0]
    const stream = await downloadContentFromMessage(message, messageType)
    let buffer = Buffer.from([])
    for await (const chunk of stream) buffer = Buffer.concat([buffer, chunk])
    return buffer
  }

  Ladybug.getFile = async (PATH, save) => {
    let res, filename
    let data = Buffer.isBuffer(PATH) ? PATH :
      /^data:.*?\/.*?;base64,/i.test(PATH) ? Buffer.from(PATH.split`,`[1], 'base64') :
      /^https?:\/\//.test(PATH) ? await (res = await getBuffer(PATH)) :
      fs.existsSync(PATH) ? (filename = PATH, fs.readFileSync(PATH)) :
      typeof PATH === 'string' ? PATH : Buffer.alloc(0)
    let type = await FileType.fromBuffer(data) || { mime: 'application/octet-stream', ext: '.bin' }
    filename = path.join(__filename, '../src/' + new Date() * 1 + '.' + type.ext)
    if (data && save) await fs.promises.writeFile(filename, data)
    return { res, filename, size: await getSizeMedia(data), ...type, data }
  }

  Ladybug.sendFile = async (jid, PATH, filename = '', caption = '', quoted, ptt = false, options = {}) => {
    let type = await Ladybug.getFile(PATH, true)
    let { data: file, filename: pathFile } = type
    let opt = { filename }
    if (quoted) opt.quoted = quoted
    if (!type) options.asDocument = true
    let mtype = '', mimetype = type.mime, convert
    if (/webp/.test(type.mime) || (/image/.test(type.mime) && options.asSticker)) mtype = 'sticker'
    else if (/image/.test(type.mime)) mtype = 'image'
    else if (/video/.test(type.mime)) mtype = 'video'
    else if (/audio/.test(type.mime)) {
      convert = await (ptt ? toPTT : toAudio)(file, type.ext)
      file = convert.data; pathFile = convert.filename; mtype = 'audio'; mimetype = 'audio/ogg; codecs=opus'
    } else mtype = 'document'
    if (options.asDocument) mtype = 'document'
    delete options.asSticker; delete options.asDocument; delete options.asImage
    let message = { ...options, caption, ptt, [mtype]: { url: pathFile }, mimetype }
    let m
    try { m = await Ladybug.sendMessage(jid, message, { ...opt, ...options }) }
    catch (e) { m = null }
    finally {
      if (!m) m = await Ladybug.sendMessage(jid, { ...message, [mtype]: file }, { ...opt, ...options })
      file = null; return m
    }
  }

  Ladybug.copyNForward = async (jid, message, forceForward = false, options = {}) => {
    let mtype = Object.keys(message.message)[0]
    let content = await generateForwardMessageContent(message, forceForward)
    let ctype = Object.keys(content)[0]
    let context = mtype !== 'conversation' ? message.message[mtype].contextInfo : {}
    content[ctype].contextInfo = { ...context, ...content[ctype].contextInfo }
    const waMessage = await generateWAMessageFromContent(jid, content, options ? {
      ...content[ctype], ...options,
      ...(options.contextInfo ? { contextInfo: { ...content[ctype].contextInfo, ...options.contextInfo } } : {})
    } : {})
    await Ladybug.relayMessage(jid, waMessage.message, { messageId: waMessage.key.id })
    return waMessage
  }

  // ── contacts.update ──────────────────────
  Ladybug.ev.on('contacts.update', update => {
    for (let contact of update) {
      let id = Ladybug.decodeJid(contact.id)
      if (store && store.contacts) store.contacts[id] = { id, name: contact.notify }
    }
  })

  // ── connection.update ────────────────────
  Ladybug.ev.on('connection.update', async (update) => {
    const { connection, lastDisconnect } = update
    try {
      if (connection === 'close') {
        const reason = new Boom(lastDisconnect?.error)?.output.statusCode
        const reasons = DisconnectReason
        if (reason === reasons.badSession) {
          console.log(chalk.red('🐞 Bad session. Delete the session folder and reconnect.'))
          process.exit(1)
        } else if ([reasons.connectionClosed, reasons.connectionLost, reasons.restartRequired, reasons.timedOut].includes(reason)) {
          console.log(chalk.yellow('🐞 Reconnecting...'))
          LadybugStart()
        } else if (reason === reasons.connectionReplaced) {
          console.log(chalk.red('🐞 Connection replaced. Close the old session first.'))
          process.exit(1)
        } else if (reason === reasons.loggedOut) {
          console.log(chalk.red('🐞 Logged out. Scan again.'))
          LadybugStart()
        } else {
          console.log(chalk.red(`🐞 Unknown disconnect: ${reason}`))
          LadybugStart()
        }
      }

      if (update.connection === 'connecting') {
        console.log(color('🐞 Connecting to WhatsApp...', randomcolor))
      }

      if (update.connection === 'open') {
        CFonts.say('LADYBUG\nMD', { font: 'block', align: 'center', gradient: [randomcolor, 'white'] })
        CFonts.say(`v${global.botVersion} — Successfully Connected!\nBy: Ladybug-MD`, {
          font: 'console', align: 'center', gradient: [randomcolor, randomcolor]
        })
        console.log(chalk.greenBright('✅ Ladybug MD is now online!'))
      }
    } catch (err) {
      console.log('connection.update error: ' + err)
      LadybugStart()
    }
  })

  // ── messages.upsert ──────────────────────
  Ladybug.ev.on('messages.upsert', async (chatUpdate) => {
    try {
      const mek = chatUpdate.messages[0]
      if (!mek.message) return
      mek.message = Object.keys(mek.message)[0] === 'ephemeralMessage'
        ? mek.message.ephemeralMessage.message : mek.message
      if (mek.key && mek.key.remoteJid === 'status@broadcast') {
        if (global.autoreadsw) Ladybug.readMessages([mek.key])
        return
      }
      if (!Ladybug.public && !mek.key.fromMe && chatUpdate.type === 'notify') return
      if (global.autoread) Ladybug.readMessages([mek.key])
      const m = smsg(Ladybug, mek, store)
      require('./handler')(Ladybug, m, chatUpdate, store)
      require('./plugins/tkm-cmds')(Ladybug, m, chatUpdate, store)
    } catch (err) {
      console.log(chalk.red('messages.upsert error: ' + err))
    }
  })

  // ── group participants update ────────────
  Ladybug.ev.on('group-participants.update', async (anu) => {
    if (!global.welcome) return
    const botNumber = Ladybug.decodeJid(Ladybug.user.id)
    if (anu.participants.includes(botNumber)) return
    try {
      const metadata = await Ladybug.groupMetadata(anu.id)
      const namagc   = metadata.subject
      for (let num of anu.participants) {
        let ppuser
        try { ppuser = await Ladybug.profilePictureUrl(num, 'image') }
        catch { ppuser = 'https://i.ibb.co/SmL6cGC/ladybug-default.jpg' }
        const check = anu.author !== num && anu.author?.length > 1
        const tag   = check ? [anu.author, num] : [num]
        if (anu.action === 'add') {
          Ladybug.sendMessage(anu.id, {
            text: check
              ? `@${anu.author.split('@')[0]} added @${num.split('@')[0]} to *${namagc}* 🎉`
              : `Welcome @${num.split('@')[0]} to *${namagc}* 🐞`,
            contextInfo: {
              mentionedJid: tag,
              externalAdReply: { thumbnailUrl: ppuser, title: '🐞 Welcome!', body: '', renderLargerThumbnail: true, sourceUrl: global.linkgc, mediaType: 1 }
            }
          })
        } else if (anu.action === 'remove') {
          Ladybug.sendMessage(anu.id, {
            text: check
              ? `@${anu.author.split('@')[0]} removed @${num.split('@')[0]} from *${namagc}*`
              : `@${num.split('@')[0]} left *${namagc}* 👋`,
            contextInfo: { mentionedJid: tag }
          })
        } else if (anu.action === 'promote') {
          Ladybug.sendMessage(anu.id, {
            text: `@${anu.author.split('@')[0]} promoted @${num.split('@')[0]} to admin in *${namagc}* ⬆️`,
            contextInfo: { mentionedJid: tag }
          })
        } else if (anu.action === 'demote') {
          Ladybug.sendMessage(anu.id, {
            text: `@${anu.author.split('@')[0]} demoted @${num.split('@')[0]} from admin in *${namagc}* ⬇️`,
            contextInfo: { mentionedJid: tag }
          })
        }
      }
    } catch (e) { console.log('group-participants.update error: ' + e) }
  })

  // ── call anti-call ───────────────────────
  Ladybug.ev.on('call', async (calls) => {
    if (!global.anticall) return
    for (let call of calls) {
      if (!call.isGroup && call.status === 'offer') {
        await Ladybug.sendMessage(call.from, {
          text: `@${call.from.split('@')[0]} Auto-blocked: AntiCall is enabled. Contact the owner to unblock.`,
          contextInfo: { mentionedJid: [call.from] }
        })
        await sleep(3000)
        await Ladybug.updateBlockStatus(call.from, 'block')
      }
    }
  })

  // ── poll updates ─────────────────────────
  async function getMessage(key) {
    if (store) {
      const msg = await store.loadMessage(key.remoteJid, key.id)
      return msg?.message
    }
    return { conversation: "Hello from Ladybug MD!" }
  }

  Ladybug.ev.on('messages.update', async (chatUpdate) => {
    for (const { key, update } of chatUpdate) {
      if (update.pollUpdates && key.fromMe) {
        const pollCreation = await getMessage(key)
        if (pollCreation) {
          const pollUpdate = await getAggregateVotesInPollMessage({ message: pollCreation, pollUpdates: update.pollUpdates })
          const toCmd = pollUpdate.filter(v => v.voters.length !== 0)[0]?.name
          if (!toCmd) return
          Ladybug.appenTextMessage(prefix + toCmd, chatUpdate)
        }
      }
    }
  })

  // ── credential save ──────────────────────
  Ladybug.ev.process(async (events) => {
    if (events['presence.update']) await Ladybug.sendPresenceUpdate('available')
    if (events['creds.update'])    await saveCreds()
  })

  return Ladybug
}

LadybugStart()

// ── hot reload ───────────────────────────
let file = require.resolve(__filename)
fs.watchFile(file, () => {
  fs.unwatchFile(file)
  console.log(chalk.yellowBright(`🔄 Reloading ${__filename}`))
  delete require.cache[file]
  require(file)
})
