require('dotenv').config();
var mqtt = require('mqtt')

var options = {
    host: process.env.HOST,
    port: 8883,
    protocol: 'mqtts',
    username: process.env.USER,
    password: process.env.PASSWORD
  }
  

  // initialize the MQTT client
  var client = mqtt.connect(options);

  module.exports = {
    client
};