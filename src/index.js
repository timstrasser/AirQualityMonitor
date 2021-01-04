const gatttool = require("./gatttool");
const { connect } = require("./device");
const scan = require("./scan");

module.exports = {
  ...gatttool,
  ...scan,
  connect
};
