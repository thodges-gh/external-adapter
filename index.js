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
    this.customParams = customParams
    this.baseParams = ['base', 'from', 'coin']
    this.quoteParams = ['quote', 'to', 'market']
    this.validated = {}
    this.validated.data = {}
    this.validated.data.extra = {}
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

    const base = this.validateBaseParam()
    if (typeof base === 'undefined') {
      throw new ValidationError('Base parameter required')
    }
    this.validated.data.base = base

    const quote = this.validateQuoteParam()
    if (typeof quote === 'undefined') {
      throw new ValidationError('Quote parameter required')
    }
    this.validated.data.quote = quote

    if (!this.validateExtraParams()) {
      throw new ValidationError('Extra param required')
    }
  }

  validateBaseParam () {
    for (const param of this.baseParams.concat(this.customParams.base)) {
      if (typeof this.input.data[param] !== 'undefined') {
        return this.input.data[param]
      }
    }
  }

  validateQuoteParam () {
    for (const param of this.quoteParams.concat(this.customParams.quote)) {
      if (typeof this.input.data[param] !== 'undefined') {
        return this.input.data[param]
      }
    }
  }

  validateExtraParams () {
    if (typeof this.customParams.extra !== 'undefined') {
      for (const param in this.customParams.extra) {
        if (this.customParams.extra[param]) {
          this.validated.data.extra = this.input.data[param]
          return typeof this.input.data[param] !== 'undefined'
        }
      }
    }
    return true
  }
}

class Requester {
  static requestRetry (options, retries, delay, customError) {
    return new Promise((resolve, reject) => {
      const retry = (options, n) => {
        return rp(options)
          .then(response => {
            if (response.body.error || customError(response.body)) {
              if (n === 1) {
                reject(response.body)
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

  static getResult (body, path) {
    return path.reduce((o, n) => o[n], body)
  }
}

exports.Requester = Requester
exports.Validator = Validator
