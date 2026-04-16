const mineflayer = require('mineflayer')
const express = require('express')
const http = require('http')
const { Server } = require('socket.io')

const app = express()
const server = http.createServer(app)
const io = new Server(server)

const PORT = process.env.PORT || 3000

app.use(express.urlencoded({ extended: true }))

let bot
let running = true
let idleCounter = 0
let logs = []

function log(msg) {
  console.log(msg)
  logs.push(msg)
  if (logs.length > 100) logs.shift()
  io.emit('log', msg)
}

// ================= PANEL =================
app.get('/', (req, res) => {
  res.send(`
<!DOCTYPE html>
<html>
<head>
<title>Bot Panel</title>
<style>
body { background:#0f0f0f; color:white; font-family:Arial; text-align:center; }
button { padding:10px; margin:5px; }
#logs { background:#111; height:300px; overflow:auto; text-align:left; padding:10px; }
.card { margin:20px; padding:20px; background:#1c1c1c; border-radius:10px; }
</style>
</head>
<body>

<h1>🤖 BOT PANEL</h1>

<div class="card">
  <button onclick="fetch('/start',{method:'POST'})">🟢 START</button>
  <button onclick="fetch('/stop',{method:'POST'})">🔴 STOP</button>
</div>

<div class="card">
  <h3>📜 LOGI</h3>
  <div id="logs"></div>
</div>

<script src="/socket.io/socket.io.js"></script>
<script>
const socket = io()
const logsDiv = document.getElementById('logs')

socket.on('log', (msg) => {
  const d = document.createElement('div')
  d.innerText = msg
  logsDiv.appendChild(d)
  logsDiv.scrollTop = logsDiv.scrollHeight
})
</script>

</body>
</html>
  `)
})

// ================= CONTROL =================
app.post('/start', (req, res) => {
  running = true
  log('🚀 START')
  if (!bot) startBot()
  res.sendStatus(200)
})

app.post('/stop', (req, res) => {
  running = false
  log('🛑 STOP')
  if (bot) bot.quit()
  res.sendStatus(200)
})

// ================= BOT =================
function startBot() {
  bot = mineflayer.createBot({
    host: 'sztabki.gg',
    username: 'BossDawidek12',
    version: false,
    auth: 'offline'
  })

  bot.on('login', () => log('🔑 login'))

  bot.once('spawn', async () => {
    log('✅ spawn')

    await sleep(3000)

    bot.chat(`/zaloguj ${process.env.PASSWORD || 'haslo123'}`)

    log('🔐 login sent')

    startIdleDetector()
  })

  bot.on('end', () => {
    log('🔄 disconnected')
    if (running) setTimeout(startBot, 5000)
  })

  bot.on('error', e => log('❌ ' + e.message))
  bot.on('kicked', r => log('❌ KICK: ' + r))
}

// ================= IDLE DETECTOR =================
function startIdleDetector() {
  setInterval(() => {
    if (!bot || !running) return

    idleCounter++

    // jeśli nic się nie dzieje → lobby
    if (idleCounter > 20) {
      idleCounter = 0
      log('🟡 lobby detected')
      runSequence()
    }

  }, 1000)

  bot.on('messagestr', () => {
    idleCounter = 0
  })
}

// ================= SEQUENCE =================
async function runSequence() {
  try {
    log('🧭 sequence start')

    await sleep(2000)

    const compass = bot.inventory.items().find(i =>
      i.name.includes('compass')
    )

    if (!compass) {
      log('❌ no compass')
      return
    }

    await bot.equip(compass, 'hand')
    log('🧭 compass equipped')

    bot.activateItem()
    await sleep(2500)

    const window = bot.currentWindow

    if (!window) {
      log('❌ no GUI')
      return
    }

    const oneblock = window.slots.find(s =>
      s?.displayName?.toLowerCase().includes('oneblock')
    )

    if (!oneblock) {
      log('❌ no oneblock')
      return
    }

    await bot.clickWindow(oneblock.slot, 0, 0)
    log('✅ oneblock clicked')

    await sleep(3000)

    bot.chat('/tpa dawidex3')
    log('📩 tpa sent')

  } catch (e) {
    log('❌ SEQ ERROR: ' + e.message)
  }
}

// ================= UTILS =================
function sleep(ms) {
  return new Promise(r => setTimeout(r, ms))
}

// ================= START SERVER =================
server.listen(PORT, () => {
  log('🌐 panel online')
})
