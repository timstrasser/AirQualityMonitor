const sleep = async miliseconds =>
  new Promise(resolve => setTimeout(() => resolve(), miliseconds));

module.exports = {
  sleep
};
