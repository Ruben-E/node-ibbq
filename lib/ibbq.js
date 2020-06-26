const noble = require('@abandonware/noble');
const util = require('util');
var Promise = require('promise');
const events = require('events');

function iBBQ() {
    this.initialized = false;

    this.settingResultCharacteristic = undefined
    this.loginCharacteristic = undefined
    this.historicDataCharacteristic = undefined
    this.realTimeDataCharacteristic = undefined
    this.settingUpdateCharacteristic = undefined

    noble.on('stateChange', state => {
        if (state === 'poweredOn') {
            console.log("powered on");
            this.initialized = true;
        } else {
            console.log("powered off");
            this.initialized = false;
        }
    });

    this.makeConnection = () => {
        return new Promise((success, error) => {
            waitForCondition(() => this.initialized, true).then(() => {
                console.log("Initialized")
                noble.startScanning([], true);
                noble.on('discover', function (peripheral) {
                    if (peripheral.advertisement.localName === "iBBQ") {
                        noble.stopScanning();
                        peripheral.connect(function (err) {
                            if (err) return error(err)
                            success(peripheral);
                        });
                    }
                });
            })
        })
    };

    this.scanCharacteristics = (peripheral) => {
        return new Promise((success, error) => {
            peripheral.discoverServices(['fff0'], (err, services) => {
                if (err) return error(err);

                let service = services.find(service => service.uuid === 'fff0');
                if (service !== undefined) {
                    service.discoverCharacteristics(['fff1', 'fff2', 'fff3', 'fff4', 'fff5'], (err, characteristics) => {
                        if (err) return error(err);

                        this.settingResultCharacteristic = characteristics.find(c => c.uuid === 'fff1');
                        this.loginCharacteristic = characteristics.find(c => c.uuid === 'fff2');
                        this.historicDataCharacteristic = characteristics.find(c => c.uuid === 'fff3');
                        this.realTimeDataCharacteristic = characteristics.find(c => c.uuid === 'fff4');
                        this.settingUpdateCharacteristic = characteristics.find(c => c.uuid === 'fff5');



                        // this.realTimeDataCharacteristic.subscribe(err => {
                        //     this.realTimeDataCharacteristic.on('notify', data => {
                        //         console.log(data)
                        //     });
                        //
                        //     this.realTimeDataCharacteristic.on('data', data => {
                        //         console.log("data", data)
                        //     });
                        // })

                        success();
                    });
                }
            });
        });
    }

    this.login = () => {
        return new Promise((success, error) => {
            const data = Buffer.from([0x21, 0x07, 0x06, 0x05, 0x04, 0x03, 0x02, 0x01, 0xb8, 0x22, 0x00, 0x00, 0x00, 0x00, 0x00])
            this.loginCharacteristic.write(data, true, (err) => {
                if (err) return error();
                success();
            });
        })
    };

    this.enableRealTimeData = () => {
        return new Promise((success, error) => {
            const data = Buffer.from([0x0B, 0x01, 0x00, 0x00, 0x00, 0x00])
            this.settingUpdateCharacteristic.write(data, true, (err) => {
                if (err) return error();
                success();
            });
        })
    }
}

util.inherits(iBBQ, events.EventEmitter);

const waitForCondition = (current, should) => {
    return new Promise((success, error) => {
        const start_time = Date.now();

        const check = () => {
            if (current() === should) success();
            else if (Date.now() > start_time + 3000) error("Timeout");
            else setTimeout(check, 100);
        }

        check();
    });
}

iBBQ.prototype.connect = function() {
    return this.makeConnection()
        .then(this.scanCharacteristics)
        .then(this.login)
        .then(this.enableRealTimeData)
};

iBBQ.prototype.onMeasurements = function(callback) {
    this.realTimeDataCharacteristic.on('data', data => {
        console.log("data real time", data.toString())
    });

    this.realTimeDataCharacteristic.notify(true, (err) => {
        if (err) {
            console.log("Unable to notify")
        } else {
            console.log("Notified")
        }
    });
}

module.exports = iBBQ;
//
// noble.on('stateChange', function (state) {
//     console.log("State change ", state);
//     if (state === 'poweredOn') {
//         console.log("powered on");
//         noble.startScanning([], true);
//     } else {
//         noble.stopScanning();
//     }
// });
//
// function login(characteristic) {
//     const data = Buffer.from([0x21, 0x07, 0x06, 0x05, 0x04, 0x03, 0x02, 0x01, 0xb8, 0x22, 0x00, 0x00, 0x00, 0x00, 0x00])
//     characteristic.write(data, false, function (err) {
//         console.log(err);
//     });
// }
//
// noble.on('discover', function (peripheral) {
//     if (peripheral.advertisement.localName === "iBBQ") {
//         noble.stopScanning();
//         peripheral.connect(function (error) {
//             console.log("Connected!")
//
//             peripheral.discoverServices(['fff0'], function(error, services) {
//                 let service = services.find(service => service.uuid === 'fff0');
//                 if (service !== undefined) {
//                     service.discoverCharacteristics(['fff1', 'fff2', 'fff3', 'fff4', 'fff5'], (error, characteristics) => {
//                         let settingResultCharacteristic = characteristics.find(c => c.uuid === 'fff1');
//                         let loginCharacteristic = characteristics.find(c => c.uuid === 'fff2');
//                         let historicDataCharacteristic = characteristics.find(c => c.uuid === 'fff3');
//                         let realTimeDataCharacteristic = characteristics.find(c => c.uuid === 'fff4');
//                         let settingUpdateCharacteristic = characteristics.find(c => c.uuid === 'fff5');
//
//
//                         if (loginCharacteristic !== undefined) {
//                             console.log("Found login characteristic");
//                             login(loginCharacteristic);
//                         }
//                     });
//                 }
//             });
//
//
//             // peripheral.discoverAllServicesAndCharacteristics(function (error, services, characteristics) {
//             //     console.log('Discovered services and characteristics', services, characteristics);
//             //
//             //     for (const characteristic of characteristics) {
//             //         if (characteristic.uuid === 'fff2') {
//             //             console.log("Found login characteristic");
//             //             const data = Buffer.from([0x21, 0x07, 0x06, 0x05, 0x04, 0x03, 0x02, 0x01, 0xb8, 0x22, 0x00, 0x00, 0x00, 0x00, 0x00])
//             //             characteristic.write(data, false, function (err) {
//             //                 console.log(err);
//             //             });
//             //         }
//             //     }
//             // })
//         });
//     }
// });
