require('dotenv').config();

const { Writable } = require('stream');
const logger = require('log-essentials')();
const socketIOLogger = require('log-essentials')('SOCKET.IO');
const bluetoothLogger = require('log-essentials')('BLUETOOTH');
const dbLogger = require('log-essentials')('DATABASE');
const express = require('express');
const app = express();
const http = require('http').createServer(app);
const io = require('socket.io')(http);
const { InfluxDB, Point } = require('@influxdata/influxdb-client');

// You can generate a Token from the "Tokens Tab" in the UI
const token = process.env.INFLUX_DB_TOKEN;
const org = process.env.INFLUX_DB_ORG;
const bucket = process.env.INFLUX_DB_BUCKET;

const client = new InfluxDB({
  url: process.env.INFLUX_DB_URL,
  token: token,
});

const writeApi = client.getWriteApi(org, bucket);
writeApi.useDefaultTags({ host: 'host1' });

const gatttool = require('./src/index');
const byteUtil = require('./byteUtil.js');

const DEBUG_OUTPUT = false;
const REFRESH_RATE = 15000;
const DEVICE_NAME = '6003#060030393CB3C';
const DATAPOINTS_CACHE_SIZE = 1000;

var latestSensorData;
var globalSensorData = [];

var updateReceived = true;

function cacheSensorData(sensorData) {
  latestSensorData = sensorData;

  globalSensorData.push(sensorData);

  if (globalSensorData.length > DATAPOINTS_CACHE_SIZE) {
    globalSensorData.shift();
  }

  updateReceived = true;
}

function processSensorData(sensorData) {
  if(!sensorData) return;
  
  bluetoothLogger.muted(JSON.stringify(sensorData));
  io.sockets.emit('update', sensorData);

  writeApi.writePoint(new Point('mem').floatField('temp', sensorData.temp));
  writeApi.writePoint(new Point('mem').floatField('tvoc', sensorData.tvoc));
  writeApi.writePoint(new Point('mem').floatField('hcho', sensorData.hcho));
  writeApi.writePoint(new Point('mem').floatField('co2', sensorData.co2));

  cacheSensorData(sensorData);
}

function handleData(data) {
  const byteArray = byteUtil.getByteArrayFromData(data);

  if (byteUtil.isSensorData(data)) {
    if (DEBUG_OUTPUT) {
      logger.log('##START VALUE##\n' + byteArray + '\n##END VALUE##');
    }

    processSensorData(byteUtil.parseLatesSensorData(byteArray));
  }
}

const ble = new Writable({
  objectMode: true,
  write: (data, encoding, done) => {
    if (DEBUG_OUTPUT)
      bluetoothLogger.log(`[stream] ←${data.toString(encoding)}`);
    done();
  },
});

async function startBluetoothHandler() {
  gatttool.start({ onData: handleData, stream: ble });

  bluetoothLogger.info(`Searching for Air Quality Monitor...`);

  const btAddress = await gatttool.scanFor(DEVICE_NAME, 1);

  if (btAddress) {
    bluetoothLogger.info(`Found a BT device at: ${btAddress}`);
    try {
      bluetoothLogger.info('Connecting...');
      const device = await gatttool.connect(btAddress);
      bluetoothLogger.success('Successfully connected');

      // console.log("Discovering...");
      // await device.discovery();
      // console.log("Discovery completed");
      // console.log("device.chars", device.chars);

      // await dev.write(12, "NODEJS");

      setInterval(() => {
        if(!updateReceived){
          bluetoothLogger.error('No update received! Probably connection lost!')
          bluetoothLogger.info('Restarting!')
          process.exit(0)
        }

        gatttool.write('char-write-cmd 0x0010 AB');
    
        bluetoothLogger.muted('Requesting update...');
        updateReceived = false;
      }, REFRESH_RATE);

      // setTimeout(() => gatttool.write("exit"), 15000);
    } catch (err) {
      logger.error(err, `Error occured while interacting with a device`);
      process.exit();
    }

    // process.exit();
  } else {
    bluetoothLogger.warn(`No Air Quality Monitor found!`);
    bluetoothLogger.error(`Shutting down...`);
    process.exit();
  }
}

function startExpress() {
  app.use(express.static('public'));

  app.get('/', (req, res) => {
    res.sendFile(__dirname + '/index.html');
  });

  io.on('connection', (socket) => {
    var address = socket.request.connection;

    if (latestSensorData) {
      io.sockets.emit('update', latestSensorData);
    }

    if (latestSensorData) {
      socket.emit('push', globalSensorData);
    }

    socket.on('stop', async (msg) => {
      socketIOLogger.warn('Stop event fired!');
      exit();
    });

    socket.on('calibrate', async (msg) => {
      socketIOLogger.info('Recalibrating requested!');
      gatttool.write('char-write-cmd 0x0010 AD');
    });

    socketIOLogger.success(
      address.remoteAddress + ':' + address.remotePort + ' connected!'
    );
  });

  http.listen(3001, () => {
    logger.success('Listener started on port 3001');
  });
}

function catchSigint() {
  process.on('SIGINT', function () {
    logger.warn('Interrupt signal fired!');
    exit();
  });
}

async function exit() {
  logger.warn(`Shutting down...`);
  await gatttool.end();
  bluetoothLogger.warn('Closing connection');
  await writeApi.close();
  dbLogger.warn('Closing connection');

  process.exit();
}

catchSigint();
startBluetoothHandler();
startExpress();
