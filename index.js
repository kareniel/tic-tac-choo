var choo = require('choo')
var html = require('choo/html')
var devtools = require('choo-devtools')
var Spinner = require('bytespin')

const THIS_REPO = 'https://github.com/kareniel/tic-tac-choo'
const CHOO_REPO = 'https://github.com/choojs/choo'
const X = '🚂'
const O = '🚃'
const ENDING = {
  'draw': 'It\'s a Draw!',
  'win': 'You Win!',
  'lose': 'You Lose!'
}

var app = choo()
var spinner = Spinner({ chars: '⌛⏳⏳⏳⏳⌛', speed: 2000 / 6 })

if (process.env.NODE_ENV !== 'production') {
  app.use(devtools())
}

app.route('/', mainView)
app.use(require('./hyperbus')())
app.use(store)

app.mount('body')

function store (state, emitter) {
  reset()

  emitter.on('DOMContentLoaded', function () {
    emitter.on('mark', mark)
    emitter.on('reset', reset)
  })

  function reset () {
    state.ready = false
    state.waiting = false
    state.rows = [
      [0, 0, 0],
      [0, 0, 0],
      [0, 0, 0]
    ]

    state.player = X
    state.opponent = O

    state.count = 0
    state.end = false

    emitter.emit('render')

    wait()
  }

  function wait () {
    if (!state.hyperbus) {
      return emitter.on('hyperbus:ready', hyperbus => {
        state.hyperbus = hyperbus
        getReady()
      })
    }

    getReady()
  }

  function getReady () {
    state.hyperbus.once('ready', () => {
      state.ready = true
      emitter.emit('render')
    })

    state.hyperbus.emit('ready')

    setTimeout(() => {
      state.hyperbus._remote.emit('ready')
    }, randomDelay() * 3)
  }

  function mark (x, y) {
    if (!isYourTurn() || cellIsAlreadyMarked(x, y)) return

    commit(state.player, x, y)

    if (state.end) return

    state.hyperbus.emit('mark', { x, y }, () => {
      waitForOpponent()
    })
  }

  function commit (mark, x, y) {
    state.rows[y][x] = mark
    state.count++

    emitter.emit('render')

    var won = didWin(state.player, state.rows)
    var lost = didWin(state.opponent, state.rows)

    if (won) return win()
    if (lost) return lose()
    if (state.count === 9) return draw()
  }

  function waitForOpponent () {
    state.waiting = true
    emitter.emit('render')

    state.hyperbus.once('mark', payload => {
      state.waiting = false
      commit(state.opponent, payload.x, payload.y)
    })

    ai()
  }

  function ai () {
    var { x, y } = getRandomCoordinates()

    setTimeout(() => {
      state.hyperbus._remote.emit('mark', { x, y })
    }, randomDelay())
  }

  function getRandomCoordinates () {
    var waiting = true
    var x = 0
    var y = 0

    while (waiting) {
      y = getRandomInt(3)
      x = getRandomInt(3)

      if (!state.rows[y][x]) waiting = false
    }

    return { x, y }
  }

  function isYourTurn () {
    return state.ready && !state.waiting && !state.end
  }

  function cellIsAlreadyMarked (x, y) {
    return state.rows[y][x] !== 0
  }

  function win () {
    state.waiting = false
    state.end = ENDING.win
    emitter.emit('render')
  }

  function lose () {
    state.waiting = false
    state.end = ENDING.lose
    emitter.emit('render')
  }

  function draw () {
    state.waiting = false
    state.end = ENDING.draw
    emitter.emit('render')
  }
}

function mainView (state, emit) {
  return html`
    <body class="bg-pink flex flex-column justify-center items-center min-vh-100 relative ba bw3 b--pinker pa2">
      <h1 class="mb4 pinker fwb">
        tic-tac-choo
      </h1>

      ${gameView(state, emit)}

      <div class="w-100 h5 mt2">
        ${waitingView(state, emit)}
        ${endView(state, emit)}
      </div>


      <footer class="tc bg-pinker pink ph2 pv0 w-100 absolute bottom-0">
        <p>
        <a href="${THIS_REPO}">made</a> with <a href="${CHOO_REPO}">choo</a>.<br>
        </p>        
      </footer>
    </body>`
}

function gameView (state, emit) {
  return html`
    <div class="flex flex-column justify-center items-center br bb bw2 bw1-l b--pinker">
      ${state.rows.map((row, y) => html`
        <div class="flex flex-row">
          ${row.map((cell, x) => cellView(cell, x, y, emit))}
        </div>
      `)}
    </div>`
}

function cellView (cell, x, y, emit) {
  return html`
    <div class="pointer w3 h3 w2-l f3-l h2-l f2 bl bt bw2 bw1-l b--pinker bg-white flex justify-center items-center" 
      onclick=${e => emit('mark', x, y)}>
      ${cell || ''}
    </div>`
}

function waitingView (state, emit) {
  if (!state.ready) {
    return html`
      <p class="tc flex flex-row justify-center items-center ph3">
        <span class="hourglass w1 h1 flex justify-center items-center">
          ${spinner.render(true)}
        </span> 
        <span class="ph3">Waiting for opponent to be ready...</span>
      </p>`
  }
  if (!state.waiting) return ''
  return html`<p class="tc">Waiting for opponent to make a move...</p>`
}

function endView (state, emit) {
  if (!state.end) return ''
  return html`
    <p class="flex flex-column justify-center items-center w-100 tc">
      <h2>${state.end}</h2>

      <button class="ph3 pv2 f3 pointer bg-pink pinker b--pinker bw2" onclick=${e => emit('reset')}>
        Reset
      </button>
    </p>`
}

function didWin (mark, rows) {
  var stacks = [ [], [], [] ]

  var horizontal = rows
    .map((row, x) => row.map((cell, y) => {
      if (cell === mark) stacks[y].push(x)
      return cell === mark
    }))
    .some(row => row.every(cell => cell === true))

  if (horizontal) return true

  var vertical = stacks.some(stack => stack.length === 3)

  if (vertical) return true

  var diagonal = validateDiagonals(mark, rows)

  if (diagonal) return true

  return false
}

function validateDiagonals (mark, rows) {
  return (
    rows[0][0] === mark &&
    rows[1][1] === mark &&
    rows[2][2] === mark
  ) || (
    rows[2][0] === mark &&
    rows[1][1] === mark &&
    rows[0][2] === mark
  )
}

function getRandomInt (max) {
  return (Math.floor(Math.random() * Math.floor(max)))
}

function randomDelay () {
  return (getRandomInt(5) * 250) + 500
}
