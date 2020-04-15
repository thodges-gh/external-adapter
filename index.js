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
  constructor (input, customParams) {
    this.input = input
    this.customParams = customParams || {}
    this.validated = { data: { } }
    this.validateInput()
  }

  validateInput () {
    if (typeof this.input.id === 'undefined') {
      this.input.id = '1'
    }
    this.validated.id = this.input.id

    if (typeof this.input.data === 'undefined') {
      throw new ValidationError('No data supplied')
    }

    for (const key in this.customParams) {
      if (Array.isArray(this.customParams[key])) {
        this.validateRequiredParam(this.getRequiredArrayParam(this.customParams[key]), key)
      } else if (this.customParams[key] === true) {
        this.validateRequiredParam(this.input.data[key], key)
      } else {
        this.validated.data[key] = this.input.data[key]
      }
    }
  }

  validateRequiredParam (param, key) {
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
    return result
  }

  static getResult (data, path) {
    if (data.hasOwnProperty('body')) {
      data = data.body
    }
    return path.reduce((o, n) => o[n], data)
  }

  static errorCallback (jobRunID, error, callback) {
    if (typeof jobRunID === 'undefined') jobRunID = '1'
    if (typeof error === 'undefined') error = 'An error occurred'
    callback(500, {
      jobRunID,
      status: 'errored',
      error,
      statusCode: 500
    })
  }

  static successCallback (jobRunID, statusCode, data, callback) {
    if (typeof jobRunID === 'undefined') jobRunID = '1'
    if (typeof statusCode === 'undefined') statusCode = 200
    if (data.hasOwnProperty('body')) {
      data = data.body
    }
    if (!data.hasOwnProperty('result')) {
      data.result = null
    }
    callback(statusCode, {
      jobRunID,
      data,
      result: data.result,
      statusCode
    })
  }
}

exports.Requester = Requester
exports.Validator = Validator
