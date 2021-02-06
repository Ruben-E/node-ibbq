Work in process!

# NodeJS library for iBBQ Devices (BLE)

A nodeJS library to connect to and read temperatures from iBBQ based bluetooth thermometers.

Known supported devices:

- Inkbird IBT-2X, IBT-4X, IBT-6X
- HerQs EasyBBQ pro (my personal device)

Probably many other support thermometers since it's rebranded to many others.

Heavily inspired by the Go version of this library: https://github.com/sworisbreathing/go-ibbq. Many thanks!

## Usage

Taken from the examples folder:

```
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

```

## Example

Make sure your BBQ thermometer is not paired to another device before running the example.

```shell
npm install
npm run build
node examples/logger.js
```
