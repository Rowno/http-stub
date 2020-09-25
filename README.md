# http-stub [![Travis](https://travis-ci.com/Rowno/http-stub.svg?branch=master)](https://travis-ci.com/Rowno/http-stub)

> Simple HTTP stubbing library for Node.js.

## Features

- Real HTTP server (no monkey patching).
- Blazing fast.
- Stub response headers, status code and body.
- Supports text, JSON, urlencoded and Buffer request bodies.
- Simulate slow responses.
- Simulate network errors.
- Minimal boilerplate.
- Easily verify that all requests were stubbed.
- Supports fully asynchronous test suites (pairs well with [AVA](https://github.com/avajs/ava)).
- Assertions are always attributed to tests and easy to debug.
- HTTPS support.

## Install

```sh
yarn add --dev @rowno/http-stub
# or
npm install --save-dev @rowno/http-stub
```

## Usage

```js
import test from 'ava'
import createHttpStub from '@rowno/http-stub'
import got from 'got'

test.beforeEach(async (t) => {
  // Create a fresh server instance for each test
  t.context.httpStub = await createHttpStub()
})

test.afterEach((t) => {
  // Verify that all the requests were stubbed
  t.context.httpStub.verify()
})

test.afterEach.always(async (t) => {
  // Stop the server to free up the port
  await t.context.httpStub.stop()
})

test('can send a JSON POST', async (t) => {
  // Add a response stub
  t.context.httpStub.addStub({
    statusCode: 202,
    delay: 100,
    body: { wow: 'such response' },
  })

  // Make a HTTP request to the stub server
  const response = await got(t.context.httpStub.url, {
    json: true,
    body: { wow: 'such request' },
  })
  // Get the request details
  const request = t.context.httpStub.requests[0]

  t.is(request.method, 'POST')
  t.deepEqual(request.body, { wow: 'such request' })

  t.is(response.statusCode, 202)
  t.deepEqual(response.body, { wow: 'such response' })
})
```

## API

### createHttpStub([options])

Returns: `Promise<HttpStub>`

Creates a new [`HttpStub`](#httpstub) server instance. You should create a fresh instance for each of your tests.

#### options

Type: `object`

##### https

Type: `boolean` or `object`<br>
Default: `false`

Changes the server to be a HTTPS server. If set to `true` a self signed certificate will be used. Otherwise it can be set to an object map containing `key`, `cert` and `passphrase` keys (like [`tls.createSecureContext()`](https://nodejs.org/docs/latest/api/tls.html#tls_tls_createsecurecontext_options)).

### HttpStub

A stubbed HTTP server instance. It contains methods for controlling the server and adding stubs, and properties for asserting the requests that hit it.

#### start()

Returns: `Promise`

Starts the HTTP server. You shouldn't normally need to call this because [`createHttpStub()`](#createhttpstuboptions) calls it for you.

#### stop()

Returns: `Promise`

Stops the HTTP server. You should call this in your test cleanup to free up the port.

#### addStub(options)

Adds a single response stub. The stub will only be used for a single request and then discarded. This allows you to test behavior like retries.

##### options

Type: `object`

###### statusCode

Type: `integer`<br>
Default: `200`

Sets the response status code.

###### headers

Type: `object`

Object map that sets the response headers.

###### body

Type: `object`, `array`, `string`, `Buffer` or `function`

Sets the response body. Objects/arrays will be JSON encoded and strings/Buffers will sent as is. If you don't set the content-type header, one will automatically be provided.

The body can also be set to a callback function for dynamically generating the body. The function will be passed an object containing `method`, `url`, `headers` and `body` keys (the same keys as a single [request](#requests)).

###### delay

Type: `integer`

Delays the response by the given number of milliseconds. Useful for testing timeouts.

###### networkError

Type: `boolean`

Simulates a `ECONNRESET` error by abruptly ending the connection. Useful for testing network error handling and retries.

#### verify()

Utility function for making sure all the requests were stubbed. It throws an exception if some of the requests weren't stubbed or if some of the stubs weren't used. Useful for calling in the `afterEach` test hook to make sure everything ran as expected.

#### requests

Type: `array<object>`

Array requests that hit the server. Each request has the following properties.

##### method

Type: `string`

The request's HTTP method, e.g: `POST`.

##### url

Type: `string`

The request's URL, e.g: `/test`

##### headers

Type: `object`

The request's HTTP headers.

##### body

Type: `object`, `array`, `string` or `Buffer`

The request's body. It'll automatically be decoded based on the `content-type` header you send. `application/json` will be JSON decoded, `application/x-www-form-urlencoded` will be parsed using the `querystring` module, `text/*` will be converted to a string, and everything else will be a Buffer.

#### unStubbedRequests

Type: `array<object>`

Array of requests that hit the server that didn't have any stubbed responses. Contains the same thing as [`requests`](#requests).

#### stubs

Type: `array<object>`

Array of unused response stubs. Each stub has the same properties as the [`addStub()` options](#addstuboptions).

#### notRequested

Type: `boolean`

Utility assertion property that's true when the server hasn't received any requests.

#### requested

Type: `boolean`

Utility assertion property that's true when the server has received at least one request.

#### requestedOnce

Type: `boolean`

Utility assertion property that's true when the server has received exactly one request.

#### requestedTwice

Type: `boolean`

Utility assertion property that's true when the server has received exactly two requests.

#### requestedThrice

Type: `boolean`

Utility assertion property that's true when the server has received exactly three requests.

## License

http-stub is released under the MIT license.

Copyright © 2018 Roland Warmerdam.
