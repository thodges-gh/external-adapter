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
  endpoint: false
}
```

Validation of the requester's input parameters can be done by creating an instance of the Validator.

```javascript
let validator
try {
  // The input data is validated upon instantiating the Validator
  validator = new Validator(input, customParams)
} catch (error) {
  // If validation fails, you can immediately exit the function without invoking an API call
  errorCallback(input.id, error, callback)
}
```

Validated params can be obtained from the `validator.validated` object.

```javascript
// The jobRunID is always supplied by the Chainlink node, but in case it's not supplied
// upon invoking the external adapter, it will default to '1'
const jobRunID = validator.validated.id
// Since endpoint doesn't need to be supplied by the requester, we can assign a default value
const endpoint = validator.validated.data.endpoint || 'price'
// We specified that one of the values in the base array should be a parameter in use, that
// value is stored in the name of the key you specified for the array
const base = validator.validated.data.base
const quote = validator.validated.data.quote
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
Requester.requestRetry(options, customError)
  .then(response => {
    response.body.result = Requester.validateResult(response.body, ['eth', 'usd'])
    successCallback(jobRunID, response.statusCode, response.body, callback)
  })
  .catch(error => {
    errorCallback(jobRunID, error, callback)
  })
```

You can use `validateResult` to obtain the value at the given path. It takes the response body's object and an array representing the JSON path to return. If the value at the given path is `undefined`, an error will be thrown.

```javascript
const result = Requester.validateResult(response.body, ['eth', 'usd'])
```

The `getResult` function is similar to `validateResult` but if the value at the given path is not found, no error will be thrown.

```javascript
const result = Requester.getResult(response.body, ['eth', 'usd'])
```
