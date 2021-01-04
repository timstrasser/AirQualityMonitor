const {
  HCICONFIG,
  HCICONFIG_DOWN_ARGS,
  HCICONFIG_UP_ARGS,
  HCITOOL_SCAN,
  HCITOOL_SCAN_REGEX
} = require("./config");
const spawn = require("child_process").spawn;
const exec = require("child_process").exec;
const retry = require("./retry");
const sleep = require("./util").sleep;

let child = null;

const runCommand = ({ name, args = [], debug = false }) =>
  new Promise(resolve => {
    let childCommand = spawn(name, args);

    if (debug) {
      console.log(`run command: ${name} ${args.join(" ")}`);

      childCommand.stdout.on("data", data => {
        console.log(`stdout: '${data.toString()}'`);
      });

      childCommand.stderr.on("data", data => {
        console.log(`stderr: '${data.toString()}'`);
      });
    }

    childCommand.on("close", resolve());
  });

const hciRestart = async () => {
  await runCommand({
    name: HCICONFIG,
    args: HCICONFIG_DOWN_ARGS
  });
  await sleep(1000);
  await runCommand({ name: HCICONFIG, args: HCICONFIG_UP_ARGS });
  await sleep(1000);
};

const initScanning = timeoutSeconds =>
  new Promise((resolve, reject) => {
    child = exec(HCITOOL_SCAN.replace("$timeout", timeoutSeconds), {
      shell: true
    });

    child.stdout.on("data", data => {
      resolve(data);
    });

    child.stderr.on("data", async data => {
      console.log(`ERROR initScanning: '${data.toString()}'`);
      reject(data.toString());
    });

    child.on("close", function(code) {});
  }).catch(e => {
    throw e;
  });

const scan = async (timeoutSeconds, options = {}) => {
  return await retry(
    async ({ numRetries }) => {
      const scanData = await initScanning(timeoutSeconds);
      return scanData;
    },
    {
      retries: 2,
      onRetry: async () => {
        await hciRestart(options);
      }
    }
  );
};

const scanFor = async (name = "", timeoutSeconds = 2) => {
  const rawResult = await scan(timeoutSeconds);

  const lines = rawResult.split(/[\r\n]+/);

  for (let line of lines) {
    const groups = line.match(HCITOOL_SCAN_REGEX);
    if (groups && groups.includes(name)) {
      return groups[1];
    }
  }
};

const stopScanning = () => {
  console.log("stop scanning");
};

module.exports = {
  scan,
  scanFor,
  stopScanning
};
