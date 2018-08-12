var multifeed = require('multifeed')
var hypercore = require('hypercore')
var ram = require('random-access-memory')

var Bus = require('./Bus')

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

    var remoteLog = multifeed(hypercore, storage, opts)

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
