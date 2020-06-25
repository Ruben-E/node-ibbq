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
            console.log("Connected!")
            peripheral.discoverAllServicesAndCharacteristics(function (error, services, characteristics) {
                console.log('Discovered services and characteristics', services, characteristics);

                for (const characteristic of characteristics) {
                    if (characteristic.uuid === 'fff2') {
                        console.log("Found login characteristic");
                        const data = Buffer.from([0x21, 0x07, 0x06, 0x05, 0x04, 0x03, 0x02, 0x01, 0xb8, 0x22, 0x00, 0x00, 0x00, 0x00, 0x00])
                        characteristic.write(data, false, function (err) {
                            console.log(err);
                        });
                    }
                }
            })
        });
    }
});
