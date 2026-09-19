const HOST = process.env.MC_HOST
const PORT = parseInt(process.env.MC_PORT || '25565', 10)
const USERNAME = process.env.MC_USERNAME || 'AFKBot'
const AUTH = process.env.MC_AUTH || 'offline'          // 'offline' (online-mode=false server) | 'microsoft'
const VERSION = process.env.MC_VERSION || false        // false = auto-detect from server

const log = (...a) => console.log(new Date().toISOString(), ...a)

// Reconnect delay in seconds: 10, 20, 40, ... capped at 5 min.
function backoff (attempt) {
  return Math.min(300, 10 * 2 ** Math.min(attempt - 1, 6))
}

if (process.argv[2] === '--selftest') {
  const assert = require('assert')
  assert.strictEqual(backoff(1), 10)
  assert.strictEqual(backoff(2), 20)
  assert.strictEqual(backoff(4), 80)
  assert.strictEqual(backoff(99), 300)
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
    // Anti-AFK: short hop + random look every 45s. Most idle-kick plugins
    // fire at 3-5 minutes, so this stays well inside the window.
    jiggle = setInterval(() => {
      bot.setControlState('jump', true)
      setTimeout(() => bot.setControlState('jump', false), 300)
      bot.look(Math.random() * Math.PI * 2, (Math.random() - 0.5) * 0.8, true)
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
    const wait = backoff(attempt)
    log(`disconnected (${reason}); reconnecting in ${wait}s`)
    setTimeout(start, wait * 1000)
  })
}

start()
