const iBBQ = require('..')

iBBQ.connect().then(_ => {
    console.log("Connected")
    iBBQ.startMeasurements((err, measurement) => {
        console.log(err, measurement)
    })
}).catch(err => {
    console.error(err);
})
