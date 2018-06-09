'use strict'
const url = require('url')
const micro = require('micro')

class HttpStub {
  constructor() {
    this.requests = []

    this._handler = this._handler.bind(this)
  }

  async start() {
    this._server = micro(this._handler)

    return new Promise((resolve, reject) => {
      this._server.once('error', reject)

      this._server.listen(0, '127.0.0.1', () => {
        const {port} = this._server.address()
        this.url = `http://127.0.0.1:${port}`

        this._server.removeListener('error', reject)
        resolve()
      })
    })
  }

  async stop() {
    if (!this._server || !this._server.listening) {
      return
    }

    return new Promise((resolve, reject) => {
      this._server.close(error => {
        if (error) {
          reject(error)
        } else {
          resolve()
        }
      })
    })
  }

  stub() {}

  async _handler(req, res) {
    const body = await micro.json(req)

    this.requests.push({
      method: req.method,
      url: url.parse(req.url, true),
      headers: req.headers,
      body
    })

    micro.send(res, 200, {message: 'Hello world'})
  }
}

module.exports = HttpStub
