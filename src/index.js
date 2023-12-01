'use strict'
const url = require('url')
const querystring = require('querystring')
const util = require('util')
const https = require('https')
const micro = require('micro')
const joi = require('@hapi/joi')
const selfSignedCert = require('openssl-self-signed-certificate')

function sleep(ms) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms)
  })
}

const optionsSchema = joi
  .object({
    https: [
      joi.bool(),
      joi.object({
        key: joi.alternatives().try(joi.binary(), joi.string()).required(),
        cert: joi.alternatives().try(joi.binary(), joi.string()).required(),
        passphrase: joi.string(),
      }),
    ],
  })
  .default()

const stubSchema = joi
  .object({
    statusCode: joi.number().min(100).max(599).integer().default(200),
    headers: joi.object().pattern(/.*/, joi.string()),
    body: joi.any(),
    delay: joi.number().min(0).integer(),
  })
  .default()

class HttpStub {
  constructor(options = {}) {
    this.requests = []
    this.unStubbedRequests = []
    this.stubs = []
    this.notRequested = true
    this.requested = false
    this.requestedOnce = false
    this.requestedTwice = false
    this.requestedThrice = false

    this.start = this.start.bind(this)
    this.stop = this.stop.bind(this)
    this.addStub = this.addStub.bind(this)
    this.verify = this.verify.bind(this)

    if (options.https === true) {
      options.https = {
        key: selfSignedCert.key,
        cert: selfSignedCert.cert,
        passphrase: selfSignedCert.passphrase,
      }
    }

    // Make private properties non-enumerable to make ava's magic assertions clean ✨
    Object.defineProperty(this, '_options', {
      value: joi.attempt(options, optionsSchema),
    })
    Object.defineProperty(this, '_handler', {
      value: this._handler.bind(this),
    })
    Object.defineProperty(this, '_server', {
      writable: true,
      value: null,
    })
  }

  async start() {
    if (this._server) {
      return
    }

    if (this._options.https) {
      this._server = https.createServer(this._options.https, (req, res) =>
        micro.run(req, res, this._handler)
      )
    } else {
      this._server = micro(this._handler)
    }

    return new Promise((resolve, reject) => {
      this._server.once('error', reject)

      this._server.listen(0, '127.0.0.1', () => {
        const { port } = this._server.address()

        if (this._options.https) {
          this.url = `https://127.0.0.1:${port}`
        } else {
          this.url = `http://127.0.0.1:${port}`
        }

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
      this._server.close((error) => {
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
    this.stubs.push(joi.attempt(stub, stubSchema))
  }

  verify() {
    this._verifyUnStubbedRequests()
    this._verifyUnusedStubs()
  }

  _verifyUnStubbedRequests() {
    const unStubbedCount = this.unStubbedRequests.length

    if (unStubbedCount === 0) {
      return
    }

    let prettyRequests = this.unStubbedRequests.map((request) => {
      const clonedRequest = { ...request }
      clonedRequest.url = clonedRequest.url.href
      return clonedRequest
    })
    prettyRequests = util.inspect(prettyRequests)

    let message
    if (unStubbedCount === 1) {
      message = `1 HTTP request wasn՚t stubbed:\n${prettyRequests}`
    } else if (unStubbedCount > 1) {
      message = `${unStubbedCount} HTTP requests weren՚t stubbed:\n${prettyRequests}`
    }

    throw new Error(message)
  }

  _verifyUnusedStubs() {
    const unusedStubCount = this.stubs.length

    if (unusedStubCount === 0) {
      return
    }

    const prettyStubs = util.inspect(this.stubs)

    let message
    if (unusedStubCount === 1) {
      message = `1 HTTP stub wasn't used:\n${prettyStubs}`
    } else if (unusedStubCount > 1) {
      message = `${unusedStubCount} HTTP stubs weren՚t used:\n${prettyStubs}`
    }

    throw new Error(message)
  }

  async _handler(req, res) {
    const contentType = req.headers['content-type'] || ''
    let body

    if (contentType.startsWith('application/json')) {
      body = await micro.json(req)
    } else if (contentType.startsWith('application/x-www-form-urlencoded')) {
      const text = await micro.text(req)
      body = querystring.parse(text)
    } else if (contentType.startsWith('text/')) {
      body = await micro.text(req)
    } else {
      body = await micro.buffer(req)
    }

    const request = {
      method: req.method,
      url: url.parse(req.url, true),
      headers: req.headers,
      body,
    }

    this.requests.push(request)

    this.notRequested = false
    this.requested = true
    this.requestedOnce = this.requests.length === 1
    this.requestedTwice = this.requests.length === 2
    this.requestedThrice = this.requests.length === 3

    const stub = this.stubs.shift()

    if (!stub) {
      this.unStubbedRequests.push(request)
      res.writeHead(418, 'No Stubs', {})
      res.end(`You don't have any stubs left! 🙅`)
      return
    }

    if (stub.delay) {
      await sleep(stub.delay)
    }

    if (stub.headers) {
      for (const name of Object.keys(stub.headers)) {
        const value = stub.headers[name]
        res.setHeader(name, value)
      }
    }

    if (typeof stub.body === 'function') {
      const body = await stub.body(request)
      micro.send(res, stub.statusCode, body)
    } else {
      micro.send(res, stub.statusCode, stub.body)
    }
  }
}

module.exports = async (options) => {
  const httpStub = new HttpStub(options)
  await httpStub.start()
  return httpStub
}
