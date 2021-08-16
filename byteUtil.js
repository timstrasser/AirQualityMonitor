function isSensorData(data) {
  return data.includes('Notification');
}

function getByteArrayFromData(data) {
  const byteString = ((data + '').split(': ')[1] + '').split('\n')[0].trim();

  return byteString.split(' ');
}

function extractValueFromByteArray(from, to, byteArray) {
  const concatReducer = (accumulator, currentValue) =>
    accumulator + '' + currentValue;
  const subArray = byteArray.slice(from, to);

  if(subArray.length === 0) return

  const subByteString = subArray.reduce(concatReducer);

  return parseInt(subByteString, 16);
}

function parseLatesSensorData(byteArray) {
  const sensorData = {
    temp: extractValueFromByteArray(6, 8, byteArray) / 10,
    tvoc: extractValueFromByteArray(10, 12, byteArray) / 1000,
    hcho: extractValueFromByteArray(12, 14, byteArray) / 1000,
    co2: extractValueFromByteArray(16, 18, byteArray) / 1000,
    timestamp: new Date().getTime(),
  };

  if(!sensorData.temp) return false;

  return sensorData;
}

module.exports.parseLatesSensorData = parseLatesSensorData;
module.exports.getByteArrayFromData = getByteArrayFromData;
module.exports.isSensorData = isSensorData;
