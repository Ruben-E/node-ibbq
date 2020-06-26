const iBBQ = require('..')

iBBQ.connect().then(_ => {
    console.log("Connected")
    iBBQ.onMeasurements(measurement => {
        console.log("Test", measurement)
    })
}).catch(err => {
    console.error(err);
})
