// const PROTOCOL = 'ws'
// const GATEWAY = 'localhost:8000'

var multifeed = require('multifeed')
var hypercore = require('hypercore')
var ram = require('random-access-memory')
// var websocket = require('websocket-stream')
// var pump = require('pump')

var Bus = require('./Bus')

// const KEY = '278c4b40dbc2585b6654a55c07b23943ece48264834ae50a87af438f56fb35ff'

module.exports = create

function create () {
  return hyperbus
}

function hyperbus (state, emitter) {
  const storage = () => ram()
  const opts = { valueEncoding: 'json' }

  var log = log = multifeed(hypercore, storage, opts)

  emitter.on('DOMContentLoaded', () => {
    log.writer(onWriter)
  })

  function onWriter (err, feedA, id) {
    if (err) throw err

    // var remote = websocket(`${PROTOCOL}://${GATEWAY}/feeds/${KEY}`)
    // var local = feedA.replicate({ encrypt: false, live: true })

    // pump(remote, local, remote, err => {
    //   if (err) throw err
    // })

    // var feedBReadStream = remote.createReadStream({ live: true })

    // var bus = new Bus(feedA, feedBReadStream)

    // bus._remote = new Bus(feedB, feedAReadStream)

    // emitter.emit('hyperbus:ready', bus)
    var remoteLog = multifeed(hypercore, 'BROKE', storage, opts)

    remoteLog.writer(function (err, feedB, id) {
      if (err) throw err

      var r1 = log.replicate()
      var r2 = remoteLog.replicate()
      var feedAReadStream = feedA.createReadStream({ live: true })
      var feedBReadStream = feedB.createReadStream({ live: true })

      r1.pipe(r2).pipe(r1)

      var bus = new Bus(feedA, feedBReadStream)

      bus._remote = new Bus(feedB, feedAReadStream)

      emitter.emit('hyperbus:ready', bus)
    })
  }
}
