var choo = require('choo')
var html = require('choo/html')

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

app.route('/', mainView)
app.use(store)

app.mount('body')

function store (state, emitter) {
  reset()

  emitter.on('DOMContentLoaded', function () {
    emitter.on('mark', mark)
    emitter.on('reset', reset)
  })

  function reset () {
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
  }

  function mark (x, y) {
    if (state.end || state.waiting) return
    var alreadyMarked = state.rows[y][x] !== 0
    if (alreadyMarked) return

    commit(state.player, x, y)
    if (state.end) return

    waitForOpponent()
  }

  function commit (mark, x, y) {
    state.rows[y][x] = mark
    state.count++

    var won = didWin(state.player, state.rows)
    var lost = didWin(state.opponent, state.rows)

    if (won) return win()
    if (lost) return lose()
    if (state.count === 9) return draw()

    emitter.emit('render')
  }

  function waitForOpponent () {
    state.waiting = true

    ai((x, y) => {
      state.waiting = false
      commit(state.opponent, x, y)
    })
  }

  function ai (cb) {
    setTimeout(() => {
      var { x, y } = getRandomCoordinates()

      cb(x, y)
    }, 250)
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

  function win () {
    state.end = ENDING.win
    emitter.emit('render')
  }

  function lose () {
    state.end = ENDING.lose
    emitter.emit('render')
  }

  function draw () {
    state.end = ENDING.draw
    emitter.emit('render')
  }
}

function mainView (state, emit) {
  return html`
    <body class="bg-pink mt5 flex flex-column justify-center items-center">
      <h1 class="mb5 pinker">
        tic-tac-choo
      </h1>

      <div class="w-100 h3">
        ${waitingView(state, emit)}
      </div>

      ${gameView(state, emit)}

      <div class="w-100 h4">
        ${endView(state, emit)}
      </div>

      <p class="mt5 tc">
        made with <a href="${CHOO_REPO}">choo</p>.
        feel free to <a href="${THIS_REPO}">read the source code</a>.
      </p>
    </body>`
}

function gameView (state, emit) {
  return html`
    <div class="flex flex-column justify-center items-center">
      ${state.rows.map((row, y) => html`
        <div class="flex flex-row">
          ${row.map((cell, x) => cellView(cell, x, y, emit))}
        </div>
      `)}
    </div>`
}

function cellView (cell, x, y, emit) {
  return html`
    <div class="pointer w3 h3 f2 ba b--gray bg-white flex justify-center items-center" 
      onclick=${e => emit('mark', x, y)}>
      ${cell || ''}
    </div>`
}

function waitingView (state, emit) {
  if (!state.waiting) return ''
  return html`<p class="tc">Waiting for opponent to make a move...</p>`
}

function endView (state, emit) {
  if (!state.end) return ''
  return html`
    <p class="flex flex-column justify-center items-center w-100 tc">
      <h2>${state.end}</h2>

      <button class="w3" onclick=${e => emit('reset')}>
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
