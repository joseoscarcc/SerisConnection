require('dotenv').config();
const FiixCmmsClient = require('fiix-cmms-client');

const fiixCmmsClient = new FiixCmmsClient();
fiixCmmsClient.setBaseUri(process.env.BASE_URI);
fiixCmmsClient.setAppKey(process.env.APP_KEY);
fiixCmmsClient.setAuthToken(process.env.AUTH_TOKEN);
fiixCmmsClient.setPKey(process.env.P_KEY);

class Asset {
    constructor(id) {
        this.id = id;
        this.strName = "";
        this.strDescription = "";
        this.strMake = "";
        this.bolIsOnline = 1;
        this.intUpdated = 0;
        this.high_limit_condition = 0;
        this.latestReadings = {};
        this.counter_reading = 0;
        this.counter_event = 0;
        this.counter_offline = 0;
      }
  
    // Method to set the asset's name
    setName(name) {
        this.strName = name;
    }

    // Method to set the asset's description
    setDescription(description) {
        this.strDescription = description;
    }

    // Method to set the asset's city
    setCity(city) {
        this.strCity = city;
    }

    // Method to set the online status
    setOnlineStatus(isOnline) {
        this.bolIsOnline = isOnline;
    }

    // Method to update the 'intUpdated' property
    update(updatedValue) {
        this.intUpdated = updatedValue;
    }

    setLimitCondition(high_limit_condition) {
        this.high_limit_condition = high_limit_condition;
    }

    fetchAssetData() {
        fiixCmmsClient.find({
            "className": "Asset",
            "filters": [{"ql": "id = ?", "parameters": [this.id]}],
            "fields": "id, bolIsOnline, strName, strDescription, strMake, intUpdated",
            "callback": (ret) => {
                if (ret.error) {
                    console.error(ret.error);
                    return;
                }

                const assetData = ret.objects[0];
                this.strName = assetData.strName;
                this.strDescription = assetData.strDescription;
                this.strMake = assetData.strMake; 
                this.bolIsOnline = assetData.bolIsOnline;
                this.intUpdated = assetData.intUpdated;
            }
        });
    }

    fetchLatestReadings() {
        fiixCmmsClient.find({
            "className": "MeterReading",
            "filters": [{"ql": "intAssetID = ?", "parameters": [this.id]}],
            "fields": "id, intWorkOrderID, intSubmittedByUserID, intMeterReadingUnitsID, dblMeterReading, dv_intWorkOrderID, dv_intMeterReadingUnitsID, dv_intAssetID, dv_intSubmittedByUserID, intAssetID, dtmDateSubmitted",
            "callback": (userRet) => {
                if (userRet.error) {
                    console.error(userRet.error);
                    return;
                }

                const sortedObjects = userRet.objects.sort((a, b) => b.dtmDateSubmitted - a.dtmDateSubmitted);
                const latestReadings = {};

                for (const obj of sortedObjects) {
                    if (!latestReadings[obj.intMeterReadingUnitsID]) {
                        latestReadings[obj.intMeterReadingUnitsID] = obj;
                    }
                }

                this.latestReadings = latestReadings;
            }
        });
    }

    changeReading (reading, readingUnits) {
        if(this.high_limit_condition>reading){
            this.counter_reading++;
            if(this.counter_reading>=10){
                const latestReading = this.latestReadings[readingUnits];
                if (!latestReading) {
                    throw new Error(`No latest reading found for units: ${readingUnits}`);
                }

                const now = Date.now();
                const oneHourInMilliseconds = 60 * 60 * 1000;
                if (now - latestReading.dtmDateSubmitted <= oneHourInMilliseconds) {
                    throw new Error(`Latest reading for units: ${readingUnits} was submitted less than an hour ago`);
                } else {
                    const time_value = Date.now();
                    fiixCmmsClient.add({
                        "className": "MeterReading",
                        "fields": "intMeterReadingUnitsID, dblMeterReading, intAssetID, dtmDateSubmitted",
                        "object": {
                        "intMeterReadingUnitsID": readingUnits,
                        "dblMeterReading": reading,
                        "intAssetID": this.id,
                        "dtmDateSubmitted": time_value,
                        },
                        "callback": function(ret) {
                        if (!ret.error) {
                            console.log(ret.objects);
                        } else {
                            console.error(ret.error);
                        }
                        }
                    });
                }
                this.counter_reading=0;
            }
        }
    }

    triggerEvent(event) {
        this.counter_event++;
        if(this.counter_event>=10){
            fiixCmmsClient.find({
                "className": "AssetEvent",
                "filters": [{"ql": "intAssetID = ? AND intAssetEventTypeID = ?", "parameters": [this.id, event]}],
                "fields": "id, dtmDateSubmitted, intAssetEventTypeID, intAssetID, intSubmittedByUserID, intWorkOrderID, strAdditionalDescription",
                "callback": (ret) => {
                    if (ret.error) {
                        console.error(ret.error);
                        return;
                    }
        
                    const sortedObjects = ret.objects.sort((a, b) => b.dtmDateSubmitted - a.dtmDateSubmitted);
                    const latestEvent = sortedObjects[0];
        
                    const now = Date.now();
                    const oneHourInMilliseconds = 60 * 60 * 1000;
                    if (now - latestEvent.dtmDateSubmitted <= oneHourInMilliseconds) {
                        console.error(`Latest event for asset ID: ${this.id} and event type ID: ${event} was submitted less than an hour ago`);
                        return;
                    } else {
                        const time_value = Date.now();
            
                        fiixCmmsClient.add({
                        "className": "AssetEvent",
                        "object": {
                            "intAssetEventTypeID":event, 
                            "intAssetID": this.id,
                            "dtmDateSubmitted": time_value,
                            "strAdditionalDescription": "Asset was disconnected from FT Optix"
                        },
                        "fields": "id, strAdditionalDescription",
                        "callback": function(ret) {
                            if (!ret.error) {
                                console.log(ret.objects);
                            } else {
                                console.error(ret.error);
                            }
                            }
                        });
                    }
                }
            });
            this.counter_event=0;
        }
    }

    turnOffline() {
        this.counter_offline++;
        if(this.counter_offline>=10){
            if(this.bolIsOnline = 1) {
                fiixCmmsClient.change({
                    "className": "Asset",
                    "changeFields": "bolIsOnline",
                    "object": {
                    "id": this.bolIsOnline,
                    "bolIsOnline": 0
                    },
                    "fields": "id, bolIsOnline",
                    "callback": function(ret) {
                        if (!ret.error) {
                            console.log(ret.objects);
                        } else {
                            console.error(ret.error);
                        }
                    }   
                });
                const time_value = Date.now();
                fiixCmmsClient.change({
                    "className": "AssetOfflineTracker",
                    "changeFields": "intReasonOfflineID, dtmOfflineFrom",
                    "object": {
                      "intAssetID": this.id,
                      "dtmOfflineFrom": time_value,
                      "intReasonOfflineID":184637,
                    },
                    "fields": "id, intAssetID, intReasonOfflineID, dtmOfflineFrom",
                    "callback": function(ret) {
                      if (!ret.error) {
                        console.log(ret);
                      } else {
                        console.error(ret.error);
                      }
                    }
                  });
            }
            this.counter_offline=0;
        }
    }
}

module.exports = {
    Asset
};