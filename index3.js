const mineflayer = require('mineflayer')
const { pathfinder, Movements, goals } = require('mineflayer-pathfinder')
const readline = require('readline')

const botConfig = {
  host: 'sztabki.gg',
  username: 'BossDawidek12',
  version: '1.21.1'
}

let bot
let autoAttack = false
let currentTarget = null

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
})

// Bezpieczne pobieranie nazwy encji (bez warningów)
function getEntityName(entity) {
  if (!entity) return 'nieznany'
  if (entity.username) return entity.username
  if (entity.displayName) return entity.displayName
  if (entity.name) return entity.name
  return 'mob'
}

function findBestTarget() {
  if (!bot?.entity) return null

  let best = null
  let bestScore = Infinity

  for (const entity of Object.values(bot.entities)) {
    if (!entity?.position || entity === bot.entity) continue

    const dist = bot.entity.position.distanceTo(entity.position)
    if (dist > 30) continue

    let score = dist
    const nameLower = getEntityName(entity).toLowerCase()

    // Gracze
    if (entity.type === 'player' && entity.username !== bot.username) {
      score -= 150
    } 
    // Moby
    else if (entity.type === 'mob') {
      const ignored = ['armor_stand', 'item', 'xp_orb', 'arrow', 'spectral_arrow']
      if (ignored.some(i => nameLower.includes(i))) continue
      
      score -= 60
      if (nameLower.includes('blaze')) score -= 120   // największy priorytet dla blazów
    } else {
      continue
    }

    if (score < bestScore) {
      bestScore = score
      best = entity
    }
  }
  return best
}

function startBot() {
  console.log('🔥 Bot startuje...')

  bot = mineflayer.createBot(botConfig)
  bot.loadPlugin(pathfinder)

  bot.once('spawn', () => {
    const mcData = require('minecraft-data')(bot.version)
    const defaultMove = new Movements(bot, mcData)
    defaultMove.canDig = false
    bot.pathfinder.setMovements(defaultMove)
    console.log('✅ Bot gotowy! Wpisz "auto" żeby zacząć')
  })

  bot.on('message', (jsonMsg) => {
    const msg = jsonMsg.toString().trim()
    if (msg.length > 0) console.log(`[CZAT] ${msg}`)

    // Rejestracja / logowanie
    if (msg.includes('/zarejestruj') || msg.includes('zarejestruj')) {
      bot.chat('/zarejestruj Masełko122 Masełko122')
    }
    if (msg.includes('/zaloguj') || msg.includes('zaloguj')) {
      bot.chat('/zaloguj Masełko122')
    }
  })

  // ====================== SYSTEM ATAKU ======================
  setInterval(() => {
    if (!autoAttack || !bot?.entity) return

    if (!currentTarget || !currentTarget.isValid || 
        bot.entity.position.distanceTo(currentTarget.position) > 32) {
      currentTarget = findBestTarget()
    }

    if (!currentTarget) {
      bot.pathfinder.setGoal(null)
      return
    }

    const dist = bot.entity.position.distanceTo(currentTarget.position)
    const name = getEntityName(currentTarget)

    // Podejdź bliżej
    if (dist > 4.5) {
      bot.pathfinder.setGoal(new goals.GoalFollow(currentTarget, 3.8), true)
    } else {
      bot.pathfinder.setGoal(null)
    }

    // Patrz na cel (specjalnie dla blazów wyżej)
    let lookY = currentTarget.height * 0.7
    if (name.toLowerCase().includes('blaze')) {
      lookY = currentTarget.height * 1.15
    }

    bot.lookAt(currentTarget.position.offset(0, lookY, 0), true)

    // Wybierz miecz
    if (bot.quickBarSlot !== 0) bot.setQuickBarSlot(0)

    // Atak
    const now = Date.now()
    if (!bot._lastAttack || now - bot._lastAttack > 440) {
      bot.attack(currentTarget)
      bot.swingArm('right')
      bot._lastAttack = now

      console.log(`⚔️ Biję ${name.toUpperCase()} | ${dist.toFixed(1)} bloków`)
    }
  }, 90)

  bot.on('error', (err) => console.log(`❌ Błąd: ${err.message}`))
  bot.on('end', () => {
    console.log('🔄 Restart za 5 sekund...')
    setTimeout(startBot, 5000)
  })
}

// ====================== KOMENDY ======================
rl.on('line', (input) => {
  if (!bot || !bot.entity) return

  bot.pathfinder.setGoal(null)
  bot.setControlState('forward', false)
  bot.setControlState('back', false)
  bot.setControlState('left', false)
  bot.setControlState('right', false)

  const args = input.trim().split(/\s+/)
  const cmd = args[0].toLowerCase()

  try {
    if (cmd === 'auto') {
      autoAttack = !autoAttack
      currentTarget = null
      console.log(autoAttack ? '⚔️ AUTO ATAK: WŁĄCZONY' : '🛑 AUTO ATAK: WYŁĄCZONY')
    }
    else if (cmd === 'attack') {
      currentTarget = findBestTarget()
      console.log(currentTarget ? `🎯 Cel: ${getEntityName(currentTarget)}` : '❌ Brak celu w pobliżu')
    }
    else if (cmd === 'inv') {
      const win = bot.currentWindow || bot.inventory
      console.log('\n--- 🎒 EKWIPUNEK ---')
      win.slots.forEach((item, i) => {
        if (item) console.log(`Slot ${i}: ${item.displayName} x${item.count}`)
      })
    }
    else if (cmd === 'slot') {
      const s = parseInt(args[1])
      if (s >= 0 && s <= 8) bot.setQuickBarSlot(s)
    }
    else if (cmd === 'use') {
      bot.activateItem()
      bot.swingArm('right')
      console.log('🖱️ Użyto przedmiotu')
    }
    else if (cmd === 'click') {
      const slot = parseInt(args[1])
      if (!isNaN(slot)) bot.clickWindow(slot, 0, 0)
    }
    else if (cmd === 'wyrzuc') {
      const item = bot.inventory.itemInMainHand
      if (item) bot.tossStack(item)
    }
    else {
      bot.chat(input)
    }
  } catch (err) {
    console.log(`❌ Błąd komendy: ${err.message}`)
  }
})

startBot()
