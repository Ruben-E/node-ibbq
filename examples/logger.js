const iBBQ = require('../dist/index')

const thermometer = new iBBQ.iBBQ();
thermometer.connect()
    .then(_ => {
        console.log("Connected")
        thermometer.startMeasurements(measurement => {
            console.log(measurement);
        }, error => {
            console.log(error);
        })
    }).catch(err => {
        console.error(err);
    })
