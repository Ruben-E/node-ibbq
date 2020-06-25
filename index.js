const noble = require('@abandonware/noble');
const async = require('async');

noble.on('stateChange', function (state) {
    console.log("State change ", state);
    if (state === 'poweredOn') {
        console.log("powered on");
        noble.startScanning([], true);
    } else {
        noble.stopScanning();
    }
});

noble.on('discover', function (peripheral) {
    if (peripheral.advertisement.localName === "iBBQ") {
        noble.stopScanning();
        peripheral.connect(function (error) {

        });
    }
});
