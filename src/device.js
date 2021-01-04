const {
  BTADDRESS_REGEX_STRING,
  DISCOVERY_DEBOUNCE_MS,
  Errors
} = require("./config");
const { createStream, pipeStream, unpipeStream, write } = require("./gatttool");

const ConnectionStates = {
  INITIALIZED: null,
  ATTEMPTING: null,
  CONNECTING: null,
  CONNECTED: null
};

const DiscoveryStates = {
  INITIALIZED: null,
  DISCOVERING: null,
  COMPLETED: null
};

const state = {
  connect: ConnectionStates.INITIALIZED,
  discovery: DiscoveryStates.INITIALIZED
};

const createDevice = btAddress => {
  const chars = {};

  return {
    btAddress,
    chars,
    discovery: discovery(btAddress, chars)
  };
};

const connect = btAddress =>
  new Promise((resolve, reject) => {
    const stream = createStream(data => {
      // On attempting "Attempting to connect to 01:02:03:04:05:06"
      const attemptedResult = data.match(
        new RegExp(`Attempting to connect to (${BTADDRESS_REGEX_STRING})`, "i")
      );
      if (attemptedResult && typeof attemptedResult[1] === "string") {
        if (attemptedResult[1] === btAddress) {
          state.connect = ConnectionStates.ATTEMPTING;
        }
      }

      // On connecting "[01:02:03:04:05:06][LE]>"
      const connectedResult = data.match(
        new RegExp(`\\[(${BTADDRESS_REGEX_STRING})\\]`)
      );
      if (connectedResult && typeof connectedResult[1] === "string") {
        if (connectedResult[1] === btAddress) {
          state.connect = ConnectionStates.CONNECTING;
        } else {
          reject(Errors.ERROR_ALREADY_CONNECTED);
          unpipeStream(stream);
        }
      }

      // On connection "Connection successful"
      const successfulResult = data.match(/Connection successful/i);
      if (successfulResult) {
        resolve(createDevice(btAddress));
        unpipeStream(stream);
      }
    });
    pipeStream(stream);
    write(`connect ${btAddress}`);
  });

const discovery = (btAddress, chars) => async () =>
  new Promise((resolve, reject) => {
    let timeoutId;
    state.discovery = DiscoveryStates.INITIALIZED;
    const stream = createStream(data => {
      const lines = data.split(/[\r\n]+/);

      let foundAtLeastOneHandle = false;
      for (let line of lines) {
        // Match "handle:  0x000c da2e7828-fbce-4e01-ae9e-261174997c48"
        const handle = line.match(
          /handle:\s+(0x[0-9a-fA-f]{4}), uuid: ([-0-9a-fA-f]*)/
        );
        if (handle && typeof handle[1] === "string") {
          chars[handle[1]] = {
            uuid: handle[2]
          };

          foundAtLeastOneHandle = true;
        }
      }

      if (foundAtLeastOneHandle) {
        clearTimeout(timeoutId);
        timeoutId = setTimeout(resolve, DISCOVERY_DEBOUNCE_MS);
      }

      const connectedResult = data.match(
        new RegExp(`\\[(${BTADDRESS_REGEX_STRING})\\]`)
      );
      if (connectedResult && typeof connectedResult[1] === "string") {
        if (connectedResult[1] === btAddress) {
          if (state.discovery == DiscoveryStates.INITIALIZED) {
            state.discovery = DiscoveryStates.DISCOVERING;
          } else if (state.discovery === DiscoveryStates.DISCOVERING) {
            state.discovery = DiscoveryStates.COMPLETED;
            unpipeStream(stream);
            resolve();
          }
        } else {
          reject(Errors.ERROR_ALREADY_CONNECTED);
          unpipeStream(stream);
        }
      }
    });
    pipeStream(stream);
    write("char-desc");
  });

module.exports = {
  connect,
  discovery
};
