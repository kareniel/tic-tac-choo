module.exports = class Bus {
  constructor (feed, stream) {
    this._feed = feed
    this._stream = stream
    this._listeners = []
    this._remote = null

    stream.on('data', this._handleMessage.bind(this))
  }

  static noop () {}

  emit (eventName, payload, callback = Bus.noop) {
    var message = { method: eventName, params: payload }

    this._feed.append(message, callback)
  }

  once (eventName, callback) {
    this._listeners[eventName] = callback
  }

  _handleMessage (message) {
    var handler = this._listeners[message.method]

    if (!handler) return

    handler(message.params)
    this._listeners[message.method] = null
  }
}
