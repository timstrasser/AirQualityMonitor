const sleep = require("./util").sleep;

const fibonacci = n => {
  if (n <= 0) {
    return 0;
  } else if (n === 1) {
    return 1;
  }

  return fibonacci(n - 1) + fibonacci(n - 2);
};

const retry = async (
  func,
  { baseTimeoutMiliseconds = 1000, retries = 3, onRetry = () => {} } = {}
) => {
  let result;
  let numRetries = 0;
  let success = false;

  while (numRetries <= retries && !success) {
    try {
      result = await func({ numRetries });
      success = true;
    } catch (e) {
      numRetries++;
      if (numRetries <= retries) {
        await sleep(fibonacci(numRetries) * baseTimeoutMiliseconds);
        await onRetry();
      }
    }
  }

  return result;
};

module.exports = retry;
