module.exports = {
  GATTTOOL: "gatttool",
  GATTTOOL_ARGS: ["-I"],
  HCITOOL_SCAN: "timeout -s SIGINT $timeout hcitool lescan",
  HCICONFIG: "hciconfig",
  HCICONFIG_DOWN_ARGS: ["hci0", "down"],
  HCICONFIG_UP_ARGS: ["hci0", "up"],
  HCITOOL_SCAN_REGEX: /([0-9a-f]{2}:[0-9a-f]{2}:[0-9a-f]{2}:[0-9a-f]{2}:[0-9a-f]{2}:[0-9a-f]{2})\s(.*)/i,
  BTADDRESS_REGEX_STRING:
    "[0-9a-fA-F]{2}:[0-9a-fA-F]{2}:[0-9a-fA-F]{2}:[0-9a-fA-F]{2}:[0-9a-fA-F]{2}:[0-9a-fA-F]{2}",
  DISCOVERY_DEBOUNCE_MS: 250,

  Errors: {
    ERROR_ALREADY_CONNECTED: "ERROR_ALREADY_CONNECTED"
  }
};
