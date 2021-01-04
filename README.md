# Introduction

This projects uses bluez to gather air quality values from a bluetooth monitor [(see AliExpress)](https://www.aliexpress.com/item/1005001816855462.html) and serve a simple webpage to visualize them.

Also sends them to InfluxDB where long time periods can be visualized.

**Please keep in mind that this project was only tested with the monitor mentioned above and will most likely not work with any other air quality monitor!**

The files located in the src folder are from the [gatttool](https://github.com/limal/gatttool) repository which no longer exists. Therefore I copied them into this repository.

# Installation

First, you have to install bluez as shown [here](https://www.instructables.com/Control-Bluetooth-LE-Devices-From-A-Raspberry-Pi/).

If you want to use InfluxDB you have create a token to set the "INFLUX_DB_TOKEN" environment variable.
You can create a `.env` file like this:

```
INFLUX_DB_TOKEN={YOUR_TOKEN}
INFLUX_DB_ORG={YOUR_ORGANISATION}
INFLUX_DB_BUCKET={YOUR BUCKET}
```

After you run `npm i` the project should be ready to run. User `sudo npm start` to start.

# Troubleshooting

## No Air Quality Monitor found!

If no device is found please check if your device name corresponds to the device name set in index.js:

```js
const DEVICE_NAME = '6003#060030393CB3C';
```

If your device has another name, you have to change it.

## No or invalid data is being received!

Most likely you have a different monitor. If you enable DEBUG_OUTPUT, the raw data will be printed and you can reverse engeneer the bytes. If you found out what bytes correspond to what value, you can correct the offsets in the processSensorData function.
