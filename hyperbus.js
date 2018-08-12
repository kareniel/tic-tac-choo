var multifeed = require('multifeed')
var hypercore = require('hypercore')
var ram = require('random-access-memory')

module.exports = create

function create () {
  return hyperbus
}

function hyperbus (state, emitter, app) {
  const storage = () => ram()
  const opts = { valueEncoding: 'json' }

  var log

  emitter.on('DOMContentLoaded', () => {
    log = multifeed(hypercore, storage, opts)

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

      emitter.emit('hyperbus:ready', {
        local: createBus(feedA, feedBReadStream),
        remote: createBus(feedB, feedAReadStream)
      })
    })
  }
}

function createBus (feed, stream) {
  var bus = {
    _listeners: {},
    emit (eventName, payload, callback = noop) {
      var message = { method: eventName, params: payload }

      feed.append(message, callback)
    },
    once (eventName, callback) {
      this._listeners[eventName] = callback
    }
  }

  stream.on('data', message => {
    var handler = bus._listeners[message.method]
    if (!handler) return
    handler(message.params)
    bus._listeners[message.method] = null
  })

  return bus
}

function noop () {}
