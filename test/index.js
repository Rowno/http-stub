const test = require('ava')
const got = require('got')
const createHttpStub = require('../src')

test.afterEach.always(async t => {
  if (t.context.httpStub) {
    await t.context.httpStub.stop()
  }
})

test('records a request', async t => {
  const httpStub = await createHttpStub()
  t.context.httpStub = httpStub

  await got(httpStub.url, {
    json: true,
    body: {wow: 'such request'}
  })

  const req = httpStub.requests[0]
  t.is(req.method, 'POST')
  t.is(req.url.href, '/')
  t.is(req.headers['content-type'], 'application/json')
  t.deepEqual(req.body, {wow: 'such request'})
})

test('stops the server', async t => {
  const httpStub = await createHttpStub()

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

test('no requests', async t => {
  const httpStub = await createHttpStub()
  t.context.httpStub = httpStub

  t.is(httpStub.requests.length, 0)
  t.true(httpStub.notRequested)
  t.false(httpStub.requested)
  t.false(httpStub.requestedOnce)
  t.false(httpStub.requestedTwice)
  t.false(httpStub.requestedThrice)
})

test('one request', async t => {
  const httpStub = await createHttpStub()
  t.context.httpStub = httpStub

  await got(httpStub.url, {json: true, body: {}})

  t.is(httpStub.requests.length, 1)
  t.false(httpStub.notRequested)
  t.true(httpStub.requested)
  t.true(httpStub.requestedOnce)
  t.false(httpStub.requestedTwice)
  t.false(httpStub.requestedThrice)
})

test('two requests', async t => {
  const httpStub = await createHttpStub()
  t.context.httpStub = httpStub

  await Promise.all([
    got(httpStub.url, {json: true, body: {}}),
    got(httpStub.url, {json: true, body: {}})
  ])

  t.is(httpStub.requests.length, 2)
  t.false(httpStub.notRequested)
  t.true(httpStub.requested)
  t.false(httpStub.requestedOnce)
  t.true(httpStub.requestedTwice)
  t.false(httpStub.requestedThrice)
})

test('three requests', async t => {
  const httpStub = await createHttpStub()
  t.context.httpStub = httpStub

  await Promise.all([
    got(httpStub.url, {json: true, body: {}}),
    got(httpStub.url, {json: true, body: {}}),
    got(httpStub.url, {json: true, body: {}})
  ])

  t.is(httpStub.requests.length, 3)
  t.false(httpStub.notRequested)
  t.true(httpStub.requested)
  t.false(httpStub.requestedOnce)
  t.false(httpStub.requestedTwice)
  t.true(httpStub.requestedThrice)
})
