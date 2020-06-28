import {Characteristics} from "./model/characteristics";
import {Measurement, Probe} from "./model/measurement";
import {Events} from "./model/events"
import {Peripheral} from "@abandonware/noble";
import {EventEmitter} from "events";

const noble = require('@abandonware/noble');

export class iBBQ extends EventEmitter{
    bluetoothName: string;
    initialized: boolean = false;
    connected: boolean = false;
    peripheral?: Peripheral = undefined;
    characteristics?: Characteristics = undefined;

    constructor(bluetoothName: string = 'iBBQ') {
        super();

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

        noble.on('disconnect', () => {
            this.emit(Events.Disconnected)
        })
    }

    connect(): Promise<void> {
        return this.makeConnection()
            .then((peripheral: Peripheral) => {
                this.peripheral = peripheral;
                return this.scanCharacteristics(peripheral)
            })
            .then((characteristics: Characteristics) => {
                this.characteristics = characteristics;
                return this.login()
            }).then(() => {
                this.connected = true;
                this.emit(Events.Connected);
                return Promise.resolve();
            })
    }

    readMeasurements(onMeasurements: (measurements: Measurement) => void, onError: (error: Error) => void) {
        if (!this.connected) {
            onError(new Error("Not connected"));
            return;
        }

        this.enableRealTimeData().then(_ => {
            this.characteristics?.realTimeData?.on('data', (data: Buffer) => {
                const probes: Probe[] = []

                for (let i = 0; i < data.length; i++) {
                    if (i % 2 === 0) {
                        const probe = (i / 2) + 1;
                        let temperature: number | undefined = data.readIntLE(i, 2) / 10;
                        if (temperature === -1) {
                            temperature = undefined;
                        }

                        probes.push({number: probe, connected: temperature != undefined, temperature: temperature});
                    }
                }
                onMeasurements({dateTime: new Date(), probes: probes});
            });

            this.characteristics?.realTimeData?.notify(true, (err) => {
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

                            success(peripheral);
                        });
                    }
                });
            })
        })
    }

    private scanCharacteristics(peripheral: Peripheral): Promise<Characteristics> {
        return new Promise((success, error) => {
            peripheral.discoverServices(['fff0'], (err, services) => {
                if (err) return error(err);

                let service = services.find(service => service.uuid === 'fff0');
                if (service !== undefined) {
                    service.discoverCharacteristics(['fff1', 'fff2', 'fff3', 'fff4', 'fff5'], (err, characteristics) => {
                        if (err) return error(err);

                        const find = (uuid: string) => characteristics.find(c => c.uuid === uuid);

                        success({
                            settingResult: find('fff1'),
                            login: find('fff2'),
                            historicData: find('fff3'),
                            realTimeData: find('fff4'),
                            settingUpdate: find('fff5')
                        });
                    });
                }
            });
        });
    }

    private login(): Promise<void> {
        return new Promise((success, error) => {
            const data = Buffer.from([0x21, 0x07, 0x06, 0x05, 0x04, 0x03, 0x02, 0x01, 0xb8, 0x22, 0x00, 0x00, 0x00, 0x00, 0x00])
            this.characteristics?.login?.write(data, true, (err) => {
                if (err) return error();

                success();
            });
        })
    };

    private enableRealTimeData() {
        return new Promise((success, error) => {
            const data = Buffer.from([0x0B, 0x01, 0x00, 0x00, 0x00, 0x00])
            this.characteristics?.settingUpdate?.write(data, true, (err) => {
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
