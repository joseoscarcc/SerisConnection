require('dotenv').config();
const FiixCmmsClient = require('fiix-cmms-client');
var mqtt = require('mqtt');
const { client } = require('./models/mqtt');
const assets = require('./models/assets');
const http = require('http');

const server = http.createServer((req, res) => {
  res.statusCode = 200;
  res.setHeader('Content-Type', 'text/plain');
  res.end('Hello, World!\n');
});

server.listen(process.env.PORT, () => {
  console.log('Server running on port asign my assure: ${process.env.PORT}');
});

client.on('connect', function () {
    console.log('Connected to MQTT broker');
    client.subscribe('joetest');
    
});

client.on('error', function (error) {
    console.log(error);
});

const assetsMap = {};

client.on('message', async function (topic, message) {
    const assetsData = JSON.parse(message.toString());
    let assetCount = 0;

    for (const assetName in assetsData) {
        const assetId = assetsData[assetName].Asset_ID;

        if (!assetsMap[assetId]) {
            try {
                assetsMap[assetId] = new assets.Asset(assetId);
                await assetsMap[assetId].fetchAssetData();
                await assetsMap[assetId].fetchLatestReadings();
                assetCount++;
            } catch (error) {
                console.error(`Error while creating asset and fetching data: ${error}`);
            }
        }
    }

    console.log(`Received ${assetCount} new assets.`);
    console.log(assetsMap);
});
    
    // var asset = new assets.Asset(msg.id);
    // asset.fetchAssetData();
    // asset.fetchLatestReadings();
    // console.log(asset.latestreadings);




