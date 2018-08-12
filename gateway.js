// gateway server
const PORT = 8000

var express = require('express')
var expressWS = require('express-ws')
var websocketStream = require('websocket-stream/stream')
var multifeed = require('multifeed')
var hypercore = require('hypercore')
var ram = require('random-access-memory')
var pump = require('pump')

var app = express()

var logs = {}
var storage = () => ram()
var opts = { valueEncoding: 'json' }

expressWS(app)

app.ws('/feeds/:key', route)

app.listen(PORT, () => console.log('hyperbus-gateway listening at', PORT))

function route (ws, req) {
  var { key } = req.params

  var log

  if (logs[key]) {
    process.stdout.write('old', '/feeds/' + key + '\n')
    log = logs[key].log

    connectStreams()
  } else {
    process.stdout.write('new', '/feeds/' + key + '\n')
    log = multifeed(hypercore, storage, opts)

    log.writer(function (err, feed, id) {
      if (err) throw err

      logs[key] = { log }

      connectStreams()
    })
  }

  function connectStreams () {
    var remote = websocketStream(ws)
    var local = log.replicate({ encrypt: false, live: true })

    pump(remote, local, err => {
      console.error(err)
    })
  }
}
