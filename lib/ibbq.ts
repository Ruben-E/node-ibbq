const noble = require('@abandonware/noble');

import {Measurement, Probe} from "./model/measurement";
import {Characteristic, Peripheral} from "@abandonware/noble";

export class iBBQ {
    bluetoothName: string;
    initialized: boolean = false;
    connected: boolean = false;

    settingResultCharacteristic: Characteristic | undefined = undefined;
    loginCharacteristic: Characteristic | undefined = undefined;
    historicDataCharacteristic: Characteristic | undefined = undefined;
    realTimeDataCharacteristic: Characteristic | undefined = undefined;
    settingUpdateCharacteristic: Characteristic | undefined = undefined;

    constructor(bluetoothName: string = 'iBBQ') {
        this.bluetoothName = bluetoothName;

        noble.on('stateChange', (state: string) => {
            if (state === 'poweredOn') {
                console.log("powered on");
                this.initialized = true;
            } else {
                console.log("powered off");
                this.initialized = false;
            }
        });
    }

    connect(): Promise<void> {
        return this.makeConnection()
            .then((peripheral: Peripheral) => this.scanCharacteristics(peripheral))
            .then(() => this.login())
    }

    startMeasurements(onMeasurements: (measurements: Measurement) => void, onError: (error: Error) => void) {
        this.enableRealTimeData().then(_ => {
            this.realTimeDataCharacteristic?.on('data', (data: Buffer) => {
                const probes: Probe[] = []

                for (let i = 0; i < data.length; i++) {
                    if (i % 2 === 0) {
                        const probe = (i / 2) + 1;
                        let temperature: number | undefined = data.readIntLE(i, 2) / 10;
                        if (temperature === -1) {
                            temperature = undefined;
                        }

                        probes.push({number: probe, temperature: temperature});
                    }
                }
                onMeasurements({dateTime: new Date(), probes: probes});
            });

            this.realTimeDataCharacteristic?.notify(true, (err) => {
                if (err) {
                    onError(new Error(err));
                }
            });
        }).catch((err: string) => {
            onError(new Error(err));
        })
    }

    private makeConnection(): Promise<Peripheral> {
        return new Promise((success, error) => {
            this.waitForCondition(() => this.initialized, true).then(() => {
                console.log("Initialized")
                noble.startScanning([], true);
                noble.on('discover', (peripheral: Peripheral) => {
                    if (peripheral.advertisement.localName === "iBBQ") {
                        noble.stopScanning();
                        peripheral.connect((err) => {
                            if (err) return error(err)

                            console.log(this);

                            success(peripheral);
                        });
                    }
                });
            })
        })
    }

    private scanCharacteristics(peripheral: Peripheral): Promise<void> {
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

                        success();
                    });
                }
            });
        });
    }

    private login(): Promise<void> {
        return new Promise((success, error) => {
            const data = Buffer.from([0x21, 0x07, 0x06, 0x05, 0x04, 0x03, 0x02, 0x01, 0xb8, 0x22, 0x00, 0x00, 0x00, 0x00, 0x00])
            this.loginCharacteristic?.write(data, true, (err) => {
                if (err) return error();

                this.connected = true;

                success();
            });
        })
    };

    private enableRealTimeData() {
        return new Promise((success, error) => {
            const data = Buffer.from([0x0B, 0x01, 0x00, 0x00, 0x00, 0x00])
            this.settingUpdateCharacteristic?.write(data, true, (err) => {
                if (err) return error();
                success();
            });
        })
    }

    private waitForCondition(current: { (): boolean; }, should: boolean) {
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
}
