const HOST = process.env.MC_HOST
const PORT = parseInt(process.env.MC_PORT || '25565', 10)
const USERNAME = process.env.MC_USERNAME || 'AFKBot'
const AUTH = process.env.MC_AUTH || 'offline'          // 'offline' (online-mode=false server) | 'microsoft'
const VERSION = process.env.MC_VERSION || false        // false = auto-detect from server

const log = (...a) => console.log(new Date().toISOString(), ...a)

// Retry hard and never back off. When the host restarts, wakes from sleep, or
// still holds a ghost session under this name, the only thing that matters is
// being back in the player list the instant it accepts us again.
const RETRY_SECONDS = 5

if (process.argv[2] === '--selftest') {
  const assert = require('assert')
  assert.ok(RETRY_SECONDS > 0 && RETRY_SECONDS <= 15, 'retry must stay aggressive')
  assert.strictEqual(PORT, 25565, 'default port')
  assert.ok(require('mineflayer'), 'mineflayer not installed')
  console.log('selftest ok')
  process.exit(0)
}

if (!HOST) {
  console.error('MC_HOST is not set. Add it as a repository secret.')
  process.exit(1)
}

const mineflayer = require('mineflayer')
let attempt = 0

function start () {
  log(`connecting to ${HOST}:${PORT} as ${USERNAME} (auth=${AUTH})`)
  const bot = mineflayer.createBot({
    host: HOST,
    port: PORT,
    username: USERNAME,
    auth: AUTH,
    version: VERSION,
    checkTimeoutInterval: 60000
  })

  let jiggle = null

  bot.once('spawn', () => {
    attempt = 0
    log('spawned at', bot.entity.position.toString())
    // Anti-AFK: short hop + a small smooth turn every 45s. Most idle-kick
    // plugins fire at 3-5 minutes, so this stays well inside the window.
    // The turn is relative, small, and interpolated (force=false) because an
    // instant snap to a random angle reads as aim-snapping to anticheats.
    jiggle = setInterval(() => {
      bot.setControlState('jump', true)
      setTimeout(() => bot.setControlState('jump', false), 300)
      const yaw = bot.entity.yaw + (Math.random() - 0.5) * 0.5
      const pitch = Math.max(-0.4, Math.min(0.4, bot.entity.pitch + (Math.random() - 0.5) * 0.2))
      bot.look(yaw, pitch, false).catch(() => {})
    }, 45000)
  })

  bot.on('health', () => {
    if (bot.health <= 6) log(`low health: ${bot.health}`)
  })
  bot.on('death', () => log('died, respawning'))
  bot.on('kicked', reason => log('kicked:', JSON.stringify(reason)))
  bot.on('error', err => log('error:', err.message))

  bot.on('end', reason => {
    clearInterval(jiggle)
    attempt++
    log(`disconnected (${reason}); retry #${attempt} in ${RETRY_SECONDS}s`)
    setTimeout(start, RETRY_SECONDS * 1000)
  })
}

start()
