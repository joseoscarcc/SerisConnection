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

server.listen(3030, () => {
  console.log('Server running on port asign my assure: 3030');
});

client.on('connect', function () {
    console.log('Connected to MQTT broker');
    client.subscribe('FTOptix');
    
});

client.on('error', function (error) {
    console.log(error);
});

const assetsMap = {};

client.on('message', async function (topic, message) {
    const assetsData = JSON.parse(message.toString());
    let assetCount = 0;

    for (const assetName in assetsData) {
        const assetId = parseInt(assetsData[assetName].Asset_ID);
        if (assetName !== "PLC"){
            const high_limit_condition = parseFloat(assetsData[assetName].High_Limit);
            const runningString = assetsData[assetName].Running;
            const running = runningString.split(' ')[0].toLowerCase();
            
            if (!assetsMap[assetName]) {
            
                try {
                    assetsMap[assetName] = new assets.Asset(assetId);
                    await assetsMap[assetName].fetchAssetData();
                    await assetsMap[assetName].fetchLatestReadings();
                    await assetsMap[assetName].setLimitCondition(high_limit_condition);  
                    assetCount++;
                } catch (error) {
                    console.error(`Error while creating asset and fetching data: ${error}`);
                }
            }
            if(running !== true && assetsMap[assetName].bolIsOnline === 1 ){
                await assetsMap[assetName].turnOffline();
            }
            if(running === true && assetsMap[assetName].bolIsOnline === 0 ){
                await assetsMap[assetName].turnOnline(running);
            }
            if(assetName == "Mixer") {
                const mixer_vibration = parseFloat(assetsData[assetName].Vibration);
               
                const vibration_units = 584076;
                await assetsMap[assetName].changeReading(mixer_vibration, vibration_units)
            }
            if(assetName == "Oven") {
                const oven_temperature = parseFloat(assetsData[assetName].Temperature);
                
                const temperature_units = 587537;
                await assetsMap[assetName].changeReading(oven_temperature, temperature_units);
            }
            if(assetName == "Packaging") {
                const packaging_vibration = parseFloat(assetsData[assetName].Vibration);
                
                const vibration_units = 584076;
                await assetsMap[assetName].changeReading(packaging_vibration, vibration_units);
            }
            if(assetName == "Labeler") {
                const labeler_pressure = parseFloat(assetsData[assetName].Pressure);
               
                const pressure_units = 386290;
                await assetsMap[assetName].changeReading (labeler_pressure, pressure_units)
            }
        }else{
            if (!assetsMap[assetName]) {
            
                try {
                        assetsMap[assetName] = new assets.Asset(assetId);
                    } catch (error) {
                        console.error(`Error while creating asset and fetching data: ${error}`);
                    }
            }
            const Connected = Boolean(assetsData[assetName].Connected);
            if( Connected !== true) {
                if (assetsMap && assetsMap[assetName]) {
                    await assetsMap[assetName].triggerEvent(227146);
                  } else {
                    console.error(`Asset '${assetName}' not found in assetsMap.`);
                  }
            }
        }
            
    }


    const firstKey = Object.keys(assetsMap)[0];
    const firstValue = assetsMap[firstKey];

  
});
    
    // var asset = new assets.Asset(msg.id);
    // asset.fetchAssetData();
    // asset.fetchLatestReadings();
    // console.log(asset.latestreadings);




