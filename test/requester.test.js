const { assert } = require('chai')
const { Requester } = require('../requester')
const { Server } = require('./helpers/server')

describe('Requester', () => {
  const errorMessage = '500 - "There was an error"'
  const customErrorMessage = 'Could not retrieve valid data: {"result":"error","value":1}'
  const successUrl = 'http://localhost:18080'
  const errorUrl = 'http://localhost:18080/error'
  const errorTwiceUrl = 'http://localhost:18080/errorsTwice'
  const customErrorUrl = 'http://localhost:18080/customError'
  const options = {
    timeout: 10
  }
  const customError = (body) => {
    return body.result !== 'success'
  }

  const server = new Server()

  before(() => {
    server.start()
  })

  beforeEach(() => {
    server.reset()
    assert.equal(server.errorCount, 0)
  })

  it('returns an error from an endpoint', async () => {
    options.url = errorUrl
    try {
      await Requester.request(options, 1, 0)
      assert.fail('expected error')
    } catch (error) {
      assert.equal(server.errorCount, 1)
      assert.equal(error.message, errorMessage)
    }
  })

  it('accepts custom retry amounts', async () => {
    options.url = errorUrl
    try {
      await Requester.request(options, 9, 0)
      assert.fail('expected error')
    } catch (error) {
      assert.equal(server.errorCount, 9)
      assert.equal(error.message, errorMessage)
    }
  })

  it('retries errored statuses', async () => {
    options.url = errorTwiceUrl
    const { body } = await Requester.request(options, 3, 0)
    assert.equal(server.errorCount, 2)
    assert.equal(body.result, 'success')
    assert.equal(body.value, 1)
  })

  it('retries custom errors', async () => {
    options.url = customErrorUrl
    try {
      await Requester.request(options, customError, 3, 0)
      assert.fail('expected error')
    } catch (error) {
      assert.equal(server.errorCount, 3)
      assert.equal(error.message, customErrorMessage)
    }
  })

  it('returns the result from an endpoint', async () => {
    options.url = successUrl
    const { body } = await Requester.request(options)
    assert.equal(server.errorCount, 0)
    assert.equal(body.result, 'success')
    assert.equal(body.value, 1)
  })

  it('accepts optional customError param', async () => {
    options.url = successUrl
    const { body } = await Requester.request(options, customError)
    assert.equal(server.errorCount, 0)
    assert.equal(body.result, 'success')
    assert.equal(body.value, 1)
  })

  it('accepts optional retries param with customError', async () => {
    options.url = successUrl
    const { body } = await Requester.request(options, customError, 1)
    assert.equal(server.errorCount, 0)
    assert.equal(body.result, 'success')
    assert.equal(body.value, 1)
  })

  it('accepts optional retries param without customError', async () => {
    options.url = successUrl
    const { body } = await Requester.request(options, 1)
    assert.equal(server.errorCount, 0)
    assert.equal(body.result, 'success')
    assert.equal(body.value, 1)
  })

  it('accepts optional delay param with customError', async () => {
    options.url = successUrl
    const { body } = await Requester.request(options, customError, 1, 0)
    assert.equal(server.errorCount, 0)
    assert.equal(body.result, 'success')
    assert.equal(body.value, 1)
  })

  it('accepts optional delay param without customError', async () => {
    options.url = successUrl
    const { body } = await Requester.request(options, 1, 0)
    assert.equal(server.errorCount, 0)
    assert.equal(body.result, 'success')
    assert.equal(body.value, 1)
  })

  after(() => {
    server.stop()
  })
})
