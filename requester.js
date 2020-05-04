const rp = require('request-promise')
const { AdapterError } = require('./adapterError')

class Requester {
  static request (options, customError, retries = 3, delay = 1000) {
    if (typeof options === 'string') options = { url: options }
    if (typeof options.timeout === 'undefined') options.timeout = 3000
    options.resolveWithFullResponse = true
    options.json = true
    if (typeof customError !== 'function') {
      delay = retries
      retries = customError
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
                reject(new AdapterError('Could not retrieve valid data: ' + JSON.stringify(response.body)))
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
              reject(new AdapterError(error.message))
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
      throw new AdapterError('Result could not be found in path')
    }
    if (Number(result) === 0) {
      throw new AdapterError('Result cannot be 0')
    }
    return Number(result)
  }

  static getResult (data, path) {
    if (data.hasOwnProperty('body')) {
      data = data.body
    }
    return path.reduce((o, n) => o[n], data)
  }

  static adapterErrorCallback (jobRunID, error, callback) {
    setTimeout(callback(500, Requester.errored(jobRunID, error)), 0)
  }

  static errored (jobRunID = '1', error = 'An error occurred') {
    return {
      jobRunID,
      status: 'errored',
      error: new AdapterError(error),
      statusCode: 500
    }
  }

  static success (jobRunID = '1', response) {
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
