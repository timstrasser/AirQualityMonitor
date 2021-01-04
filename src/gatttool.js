const { GATTTOOL, GATTTOOL_ARGS } = require('./config');
const spawn = require('child_process').spawn;
const { Writable } = require('stream');

let child = null;

// connect error: Too many levels of symbolic links (40)
// sudo hciconfig hci0 down
// sudo hciconfig hci0 up

const end = () => {
  write('exit');
};

const createStream = (onData) =>
  new Writable({
    objectMode: true,
    write: (data, encoding, done) => {
      onData(data.toString(encoding));
      done();
    },
  });

const pipeStream = (stream) => child.stdout.pipe(stream);
const unpipeStream = (stream) => child.stdout.unpipe(stream);

const start = ({ stream = null, onData = null }) => {
  if (child === null) {
    child = spawn(GATTTOOL, GATTTOOL_ARGS);

    if (stream) {
      child.stdout.pipe(stream);
    }

    child.stdout.on('data', onData);

    child.stderr.on('data', (data) => {
      console.log(`stderr: '${data.toString()}'`);
    });

    child.on('close', function (code) {});
  } else {
    throw 'ERROR: Gatttool is already running.';
  }
};

const write = (data) => {
  child.stdin.write(`${data}\n`);
};

module.exports = {
  createStream,
  end,
  pipeStream,
  start,
  write,
  unpipeStream,
};
