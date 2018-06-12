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
    body: {wow: 'such request'},
    throwHttpErrors: false
  })

  const req = httpStub.requests[0]
  t.is(req.method, 'POST')
  t.is(req.url.href, '/')
  t.is(req.headers['content-type'], 'application/json')
  t.deepEqual(req.body, {wow: 'such request'})
})

test('stubs a response', async t => {
  const httpStub = await createHttpStub()
  t.context.httpStub = httpStub

  httpStub.addStub({
    statusCode: 203,
    headers: {'x-wow': 'such header'},
    body: {wow: 'such response'}
  })

  const res = await got(httpStub.url, {
    json: true,
    body: {wow: 'such request'},
    throwHttpErrors: false
  })

  t.is(res.statusCode, 203)
  t.is(res.headers['x-wow'], 'such header')
  t.deepEqual(res.body, {wow: 'such response'})
})

test('can delay a response', async t => {
  const httpStub = await createHttpStub()
  t.context.httpStub = httpStub

  httpStub.addStub({delay: 1000})

  const start = Date.now()
  await got(httpStub.url)
  const end = Date.now()
  const duration = end - start

  t.true(duration > 1000)
})

test('can simulate a network error', async t => {
  const httpStub = await createHttpStub()
  t.context.httpStub = httpStub

  httpStub.addStub({networkError: true})

  const error = await t.throws(got(httpStub.url, {retries: 0}))
  t.is(error.code, 'ECONNRESET')
})

test('supports json request bodies', async t => {
  const httpStub = await createHttpStub()
  t.context.httpStub = httpStub

  await got(httpStub.url, {
    json: true,
    body: {wow: 'such json'},
    throwHttpErrors: false
  })

  t.deepEqual(httpStub.requests[0].body, {wow: 'such json'})
})

test('supports plain text request bodies', async t => {
  const httpStub = await createHttpStub()
  t.context.httpStub = httpStub

  await got(httpStub.url, {
    body: 'wow, such text',
    headers: {
      'content-type': 'text/plain'
    },
    throwHttpErrors: false
  })

  t.is(httpStub.requests[0].body, 'wow, such text')
})

test('supports buffer request bodies', async t => {
  const httpStub = await createHttpStub()
  t.context.httpStub = httpStub

  await got(httpStub.url, {
    body: Buffer.from('wow, such buffer'),
    headers: {
      'content-type': 'application/octet-stream'
    },
    throwHttpErrors: false
  })

  t.true(httpStub.requests[0].body instanceof Buffer)
  t.is(httpStub.requests[0].body.toString(), 'wow, such buffer')
})

test(`returns an error when there's no more stubs`, async t => {
  const httpStub = await createHttpStub()
  t.context.httpStub = httpStub

  const error = await t.throws(got(httpStub.url, {json: true}))
  t.is(error.statusCode, 418)
  t.is(error.statusMessage, 'No Stubs')
  t.true(error.response.body.includes('🙅'))
})

test(`verify() throws an error when a request wasn't stubbed`, async t => {
  const httpStub = await createHttpStub()
  t.context.httpStub = httpStub

  await got(httpStub.url, {throwHttpErrors: false})

  const error = t.throws(() => httpStub.verify())
  t.true(error.message.includes(`1 HTTP request wasn՚t stubbed`))
})

test(`verify() doesn't throw an error when all requests hit stubs`, async t => {
  const httpStub = await createHttpStub()
  t.context.httpStub = httpStub

  httpStub.addStub()
  await got(httpStub.url)

  t.notThrows(() => httpStub.verify())
})

test(`verify() throws an error when a stub wasn't used`, async t => {
  const httpStub = await createHttpStub()
  t.context.httpStub = httpStub

  httpStub.addStub()

  const error = t.throws(() => httpStub.verify())
  t.true(error.message.includes(`1 HTTP stub wasn't used`))
})

test(`verify() doesn't throw an error when all stubs are used`, async t => {
  const httpStub = await createHttpStub()
  t.context.httpStub = httpStub

  httpStub.addStub()
  await got(httpStub.url)

  t.notThrows(() => httpStub.verify())
})

test(`the stub body can be a callback function`, async t => {
  const httpStub = await createHttpStub()
  t.context.httpStub = httpStub

  httpStub.addStub({
    body: req => {
      t.is(req.method, 'POST')
      t.is(req.url.href, '/')
      t.is(req.headers['content-type'], 'application/json')
      t.deepEqual(req.body, {wow: 'such request'})
      return {wow: 'such body callback'}
    }
  })

  const res = await got(httpStub.url, {
    json: true,
    body: {wow: 'such request'}
  })

  t.deepEqual(res.body, {wow: 'such body callback'})
})

test('can stop the server', async t => {
  const httpStub = await createHttpStub()

  await got(httpStub.url, {throwHttpErrors: false})
  await httpStub.stop()

  const error = await t.throws(
    got(httpStub.url, {throwHttpErrors: false, timeout: 500})
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

  await got(httpStub.url, {throwHttpErrors: false})

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
    got(httpStub.url, {throwHttpErrors: false}),
    got(httpStub.url, {throwHttpErrors: false})
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
    got(httpStub.url, {throwHttpErrors: false}),
    got(httpStub.url, {throwHttpErrors: false}),
    got(httpStub.url, {throwHttpErrors: false})
  ])

  t.is(httpStub.requests.length, 3)
  t.false(httpStub.notRequested)
  t.true(httpStub.requested)
  t.false(httpStub.requestedOnce)
  t.false(httpStub.requestedTwice)
  t.true(httpStub.requestedThrice)
})
