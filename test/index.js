const test = require('ava')
const got = require('got')
const HttpStub = require('../src')

test.afterEach.always(async t => {
  if (t.context.httpStub) {
    await t.context.httpStub.stop()
  }
})

test('records a request', async t => {
  const httpStub = new HttpStub()
  t.context.httpStub = httpStub

  await httpStub.start()
  await got(httpStub.url, {
    json: true,
    body: {wow: 'such request'}
  })

  const request = httpStub.requests[0]
  t.is(request.method, 'POST')
  t.is(request.url.href, '/')
  t.is(request.headers['content-type'], 'application/json')
  t.deepEqual(request.body, {wow: 'such request'})
})

test('stops the server', async t => {
  const httpStub = new HttpStub()

  await httpStub.start()
  await got(httpStub.url, {
    json: true,
    body: {wow: 'such request'}
  })
  await httpStub.stop()

  const error = await t.throws(
    got(httpStub.url, {
      json: true,
      body: {wow: 'such request'},
      timeout: 500
    })
  )
  t.is(error.code, 'ETIMEDOUT')
})
