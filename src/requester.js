const axios = require('axios')
const { AdapterError } = require('./adapterError')

class Requester {
  static request (config, customError, retries = 3, delay = 1000) {
    if (typeof config === 'string') config = { url: config }
    if (typeof config.timeout === 'undefined') {
      const timeout = Number(process.env.TIMEOUT)
      config.timeout = !isNaN(timeout) ? timeout : 3000
    }
    if (typeof customError === 'undefined') {
      customError = function _customError(data) {
        return false
      }
    }
    if (typeof customError !== 'function') {
      delay = retries
      retries = customError
      customError = function _customError(data) {
        return false
      }
    }

    return new Promise((resolve, reject) => {
      const retry = (config, n) => {
        return axios(config)
          .then(response => {
            if (response.data.error || customError(response.data)) {
              if (n === 1) {
                reject(new AdapterError('Could not retrieve valid data: ' + JSON.stringify(response.data)))
              } else {
                setTimeout(() => {
                  retries--
                  retry(config, retries)
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
                retry(config, retries)
              }, delay)
            }
          })
      }
      return retry(config, retries)
    })
  }

  static validateResultNumber (data, path) {
    const result = this.getResult(data, path)
    if (typeof result === 'undefined') {
      throw new AdapterError('Result could not be found in path')
    }
    if (Number(result) === 0 || isNaN(Number(result))) {
      throw new AdapterError('Invalid result')
    }
    return Number(result)
  }

  static getResult (data, path) {
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
    if (!response.data.hasOwnProperty('result')) {
      response.data.result = null
    }
    return {
      jobRunID,
      data: response.data,
      result: response.data.result,
      statusCode: response.status
    }
  }
}

exports.Requester = Requester
