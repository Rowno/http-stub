'use strict'
const url = require('url')
const micro = require('micro')
const joi = require('joi')

function sleep(ms) {
  return new Promise(resolve => {
    setTimeout(resolve, ms)
  })
}

const stubSchema = joi
  .object({
    statusCode: joi
      .number()
      .min(100)
      .max(599)
      .integer()
      .required(),
    headers: joi.object().pattern(/.*/, joi.string()),
    body: joi.any(),
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
    this.stubMisses = 0

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

  verify() {
    if (this.stubMisses === 1) {
      throw new Error(`1 HTTP request wasn't stubbed`)
    } else if (this.stubMisses > 1) {
      throw new Error(`${this.stubMisses} HTTP requests weren't stubbed`)
    }
  }

  async _handler(req, res) {
    const contentType = req.headers['content-type'] || ''
    let body

    if (contentType.startsWith('application/json')) {
      body = await micro.json(req)
    } else if (contentType.startsWith('text/')) {
      body = await micro.text(req)
    } else {
      body = await micro.buffer(req)
    }

    const request = {
      method: req.method,
      url: url.parse(req.url, true),
      headers: req.headers,
      body
    }

    this.requests.push(request)

    this.notRequested = false
    this.requested = true
    this.requestedOnce = this.requests.length === 1
    this.requestedTwice = this.requests.length === 2
    this.requestedThrice = this.requests.length === 3

    const response = this._responses.shift()

    if (!response) {
      this.stubMisses += 1
      return micro.send(res, 400, {
        message: "You've run out of stubs! 😱",
        code: 'NO_STUBS'
      })
    }

    if (response.delay) {
      await sleep(response.delay)
    }

    if (response.headers) {
      for (const name of Object.keys(response.headers)) {
        const value = response.headers[name]
        res.setHeader(name, value)
      }
    }

    if (typeof response.body === 'function') {
      const body = await response.body(request)
      micro.send(res, response.statusCode, body)
    } else {
      micro.send(res, response.statusCode, response.body)
    }
  }
}

module.exports = async () => {
  const httpStub = new HttpStub()
  await httpStub.start()
  return httpStub
}
