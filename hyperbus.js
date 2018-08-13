const PROTOCOL = 'ws'
const GATEWAY = 'localhost:8000'

var multifeed = require('multifeed')
var hypercore = require('hypercore')
var ram = require('random-access-memory')
var websocket = require('websocket-stream')
var pump = require('pump')
var crypto = require('crypto')

var Bus = require('./Bus')

module.exports = create

function create () {
  return hyperbus
}

function hyperbus (state, emitter) {
  const storage = () => ram()
  const opts = { valueEncoding: 'json' }

  var log = multifeed(hypercore, storage, opts)

  emitter.on('DOMContentLoaded', () => {
    log.writer('local', onWriter)
  })

  function onWriter (err, feed, id) {
    if (err) throw err

    var key = state.query.key || crypto.randomBytes(32).toString('hex')
    var remote = websocket(`${PROTOCOL}://${GATEWAY}/feeds/${key}`)
    var local = log.replicate({ encrypt: false, live: true })

    log.on('feed', (peerFeed, name) => {
      var peerFeedStream = peerFeed.createReadStream({ live: true })
      var bus = new Bus(feed, peerFeedStream)

      emitter.emit('hyperbus:ready', bus)
    })

    pump(remote, local, remote, err => {
      if (err) throw err
    })
  }
}
