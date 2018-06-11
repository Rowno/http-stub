'use strict'
const url = require('url')
const micro = require('micro')
const joi = require('joi')

// Derp function sleep(ms) {
//   return new Promise(resolve => {
//     setTimeout(resolve, ms)
//   })
// }

const stubSchema = joi
  .object({
    method: joi
      .string()
      .uppercase()
      .required(),
    path: joi.string().required(),
    headers: joi.object().pattern(/.*/, joi.string()),
    body: joi.any().required(),
    delay: joi
      .number()
      .min(0)
      .integer()
  })
  .default()

class HttpStub {
  constructor() {
    this.requests = []
    this.notRequested = true
    this.requested = false
    this.requestedOnce = false
    this.requestedTwice = false
    this.requestedThrice = false

    this.start = this.start.bind(this)
    this.stop = this.stop.bind(this)
    this.addStub = this.addStub.bind(this)

    // Make private properties non-enumerable to make ava's magic assertions clean ✨
    Object.defineProperty(this, '_handler', {
      value: this._handler.bind(this)
    })
    Object.defineProperty(this, '_server', {
      writable: true,
      value: null
    })
    Object.defineProperty(this, '_responses', {
      value: []
    })
  }

  async start() {
    if (this._server) {
      return
    }

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
    if (!this._server) {
      return
    }

    return new Promise((resolve, reject) => {
      this._server.close(error => {
        if (error) {
          reject(error)
        } else {
          this._server = null
          resolve()
        }
      })
    })
  }

  addStub(stub) {
    this._responses.push(joi.attempt(stub, stubSchema))
  }

  async _handler(req, res) {
    const body = await micro.json(req)

    this.requests.push({
      method: req.method,
      url: url.parse(req.url, true),
      headers: req.headers,
      body
    })

    this.notRequested = false
    this.requested = true
    this.requestedOnce = this.requests.length === 1
    this.requestedTwice = this.requests.length === 2
    this.requestedThrice = this.requests.length === 3

    micro.send(res, 200, {message: 'Hello world'})
  }
}

module.exports = async () => {
  const httpStub = new HttpStub()
  await httpStub.start()
  return httpStub
}
