const rp = require('request-promise')

class ValidationError extends Error {
  constructor (message) {
    super(message)
    this.name = 'ValidationError'
    this.message = message
  }

  toJSON () {
    return {
      error: {
        name: this.name,
        message: this.message
      }
    }
  }
}

class Validator {
  constructor (input, customParams, callback) {
    this.input = input
    this.customParams = customParams || {}
    this.validated = { data: { } }
    this.validateInput(callback)
  }

  validateInput (callback) {
    if (typeof this.input.id === 'undefined') {
      this.input.id = '1'
    }
    this.validated.id = this.input.id

    if (typeof this.input.data === 'undefined') {
      const error = new ValidationError('No data supplied')
      Requester.validationErrorCallback(this.input.id, error, callback)
    }

    try {
      for (const key in this.customParams) {
        if (Array.isArray(this.customParams[key])) {
          this.validateRequiredParam(this.getRequiredArrayParam(this.customParams[key]), key)
        } else if (this.customParams[key] === true) {
          this.validateRequiredParam(this.input.data[key], key, callback)
        } else {
          if (typeof this.input.data[key] !== 'undefined') {
            this.validated.data[key] = this.input.data[key]
          }
        }
      }
    } catch (error) {
      Requester.validationErrorCallback(this.input.id, error, callback)
    }
  }

  validateRequiredParam (param, key, callback) {
    if (typeof param === 'undefined') {
      throw new ValidationError(`Required parameter not supplied: ${key}`)
    }
    this.validated.data[key] = param
  }

  getRequiredArrayParam (keyArray) {
    for (const param of keyArray) {
      if (typeof this.input.data[param] !== 'undefined') {
        return this.input.data[param]
      }
    }
  }
}

class Requester {
  static requestRetry (options, customError, retries, delay) {
    if (typeof options === 'string') options = { url: options }
    if (typeof options.timeout === 'undefined') options.timeout = 1000
    if (typeof options.resolveWithFullResponse === 'undefined') options.resolveWithFullResponse = true
    if (typeof options.json === 'undefined') options.json = true
    if (typeof customError === 'undefined') {
      customError = function _customError(body) {
        return false
      }
    }
    if (typeof retries === 'undefined') retries = 3
    if (typeof delay === 'undefined') delay = 1000

    return new Promise((resolve, reject) => {
      const retry = (options, n) => {
        return rp(options)
          .then(response => {
            if (response.body.error || customError(response.body)) {
              if (n === 1) {
                reject('Could not retrieve data', response.body)
              } else {
                setTimeout(() => {
                  retries--
                  retry(options, retries)
                }, delay)
              }
            } else {
              return resolve(response)
            }
          })
          .catch(error => {
            if (n === 1) {
              reject(error.message)
            } else {
              setTimeout(() => {
                retries--
                retry(options, retries)
              }, delay)
            }
          })
      }
      return retry(options, retries)
    })
  }

  static validateResult (data, path) {
    if (data.hasOwnProperty('body')) {
      data = data.body
    }
    const result = this.getResult(data, path)
    if (typeof result === 'undefined') {
      throw new ValidationError('Result could not be found in path')
    }
    if (Number(result) === 0) {
      throw new ValidationError('Result cannot be 0')
    }
    return result
  }

  static getResult (data, path) {
    if (data.hasOwnProperty('body')) {
      data = data.body
    }
    return path.reduce((o, n) => o[n], data)
  }

  static validationErrorCallback (jobRunID, error, callback) {
    if (typeof jobRunID === 'undefined') jobRunID = '1'
    if (typeof error === 'undefined') error = 'An error occurred'
    setTimeout(callback(500, {
      jobRunID,
      status: 'errored',
      error,
      statusCode: 500
    }), 0)
  }

  static errored (jobRunID, error) {
    if (typeof jobRunID === 'undefined') jobRunID = '1'
    if (typeof error === 'undefined') error = 'An error occurred'
    return {
      jobRunID,
      status: 'errored',
      error,
      statusCode: 500
    }
  }

  static success (jobRunID, response) {
    if (typeof jobRunID === 'undefined') jobRunID = '1'
    if (!response.body.hasOwnProperty('result')) {
      response.body.result = null
    }
    return {
      jobRunID,
      data: response.body,
      result: response.body.result,
      statusCode: response.statusCode
    }
  }
}

exports.Requester = Requester
exports.Validator = Validator
