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
  static requestRetry (options, retries, delay, customError) {
    if (typeof customError === 'undefined') {
      customError = function _customError(body) {
        return false
      }
    }
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

  static validateResult (body, path) {
    const result = this.getResult(body, path)
    if (typeof result === 'undefined') {
      throw new ValidationError('Result could not be found in path')
    }
    return result
  }

  static getResult (body, path) {
    return path.reduce((o, n) => o[n], body)
  }
}

exports.Requester = Requester
exports.Validator = Validator
