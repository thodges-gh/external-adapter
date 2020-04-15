# External Adapter Helper

This repo helps with creating Chainlink external adapters in NodeJS.

## Usage

```javascript
const { Requester, Validator } = require('external-adapter')
```

## Validator

Custom parameters can be given to the Validator in order to ensure that the requester supplied parameters which are expected by the endpoint.

```javascript
const customParams = {
  // An array of strings can be used to indicate that one of
  // the following keys must be supplied by the requester
  base: ['base', 'from', 'coin'],
  quote: ['quote', 'to', 'market'],
  // Specific keys can be given a Boolean flag to indicate
  // whether or not the requester is required to provide
  // a value
  coinid: false
}
```

Validation of the requester's input parameters can be done by creating an instance of the Validator.

```javascript
let validator
try {
  validator = new Validator(input, customParams)
} catch (error) {
  callback(500, {
    jobRunID: input.id,
    status: 'errored',
    error,
    statusCode: 500
  })
}
```

## Requester

The Requester is a wrapper around the retryable pattern for reaching out to an endpoint. It can be supplied with a customError object to descript the custom error cases which the adapter should retry fetching data even if the response was successful.

```javascript
const customError = (body) => {
  if (Object.keys(body).length === 0) return true
  return false
}
```

Call `Requester.requestRetry` to have the adapter retry failed connection attempts (along with any customError cases) for the given URL within the options.

```javascript
Requester.requestRetry(options, retries, delay, customError).then(response => {
  callback(response.statusCode, {
    jobRunID,
    data: response.body,
    statusCode: response.statusCode
  })
}).catch(error => {
  callback(500, {
    jobRunID,
    status: 'errored',
    error,
    statusCode: 500
  })
})
```

You can use `validateResult` to obtain the value at the given path. It takes the response body's object and an array representing the JSON path to return. If the value at the given path is `undefined`, an error will be thrown.

```javascript
const result = Requester.validateResult(response.body, ['eth', 'usd'])
```
