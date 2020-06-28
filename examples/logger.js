const iBBQ = require('../dist/index')

const thermometer = new iBBQ.iBBQ();
const events = iBBQ.Events;
thermometer.connect()
    .then(_ => {
        console.log("Connected")
        thermometer.readMeasurements(measurement => {
            console.log(measurement);
        }, error => {
            console.log(error);
        })
    }).catch(err => {
        console.error(err);
    })

thermometer.on(events.Connected, () => {
   console.log('Jeej')
});
