const iBBQ = require('../dist/index')

const bbq = new iBBQ.iBBQ();
bbq.connect().then(_ => {
    console.log("Connected")
    bbq.startMeasurements((err, measurement) => {
        console.log(err, measurement)
    })
}).catch(err => {
    console.error(err);
})
