import {Characteristics} from "./model/characteristics";
import {Measurement, Probe} from "./model/measurement";
import {Events} from "./model/events"
import {Peripheral} from "@abandonware/noble";
import {EventEmitter} from "events";
import {BatteryLevel} from "./model/battery_level";

const noble = require('@abandonware/noble');

export class iBBQ extends EventEmitter {
    bluetoothName: string;
    initialized: boolean = false;
    connected: boolean = false;
    peripheral?: Peripheral = undefined;
    characteristics?: Characteristics = undefined;
    batteryPoller?: NodeJS.Timeout = undefined;

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
            if (this.batteryPoller) {
                clearTimeout(this.batteryPoller);
            }

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
                return this.startBatteryPoller()
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

    private startBatteryPoller() {
        return new Promise((success, error) => {
            const poll = () => {
                this.batteryPoller = setTimeout(() => {
                    if (this.connected) this.requestBatteryLevel();
                    poll();
                }, 5000);
            }


            this.characteristics?.settingResult?.on('data', (data: Buffer) => {
                if (data[0] === 0x24) {
                    let currentVoltage = data.readIntLE(1, 2)
                    let maxVoltage = data.readIntLE(3, 2)
                    if (maxVoltage == 0) maxVoltage = 6550;

                    // const voltages = [5580, 5595, 5609, 5624, 5639, 5644, 5649, 5654, 5661, 5668, 5676, 5683, 5698, 5712, 5727, 5733, 5739, 5744, 5750, 5756, 5759, 5762, 5765, 5768, 5771, 5774, 5777, 5780, 5783, 5786, 5789, 5792, 5795, 5798, 5801, 5807, 5813, 5818, 5824, 5830, 5830, 5830, 5835, 5840, 5845, 5851, 5857, 5864, 5870, 5876, 5882, 5888, 5894, 5900, 5906, 5915, 5924, 5934, 5943, 5952, 5961, 5970, 5980, 5989, 5998, 6007, 6016, 6026, 6035, 6044, 6052, 6062, 6072, 6081, 6090, 6103, 6115, 6128, 6140, 6153, 6172, 6191, 6211, 6230, 6249, 6265, 6280, 6285, 6290, 6295, 6300, 6305, 6310, 6315, 6320, 6325, 6330, 6335, 6340, 6344];
                    const voltages = [5580, 5595, 5609, 5624, 5639, 5644, 5649, 5654, 5661, 5668, 5676, 5683, 5698, 5712, 5727, 5733, 5739, 5744, 5750, 5756, 5759, 5762, 5765, 5768, 5771, 5774, 5777, 5780, 5783, 5786, 5789, 5792, 5795, 5798, 5801, 5807, 5813, 5818, 5824, 5830, 5830, 5830, 5835, 5840, 5845, 5851, 5857, 5864, 5870, 5876, 5882, 5888, 5894, 5900, 5906, 5915, 5924, 5934, 5943, 5952, 5961, 5970, 5980, 5989, 5998, 6007, 6016, 6026, 6035, 6044, 6052, 6062, 6072, 6081, 6090, 6103, 6115, 6128, 6140, 6153, 6172, 6191, 6211, 6230, 6249, 6265, 6280, 6296, 6312, 6328, 6344, 6360, 6370, 6381, 6391, 6407, 6423, 6431, 6439, 6455];
                    const percentage = (current: number, max: number) => {
                        const factor = max / 6550.0;
                        const length = voltages.length;

                        if (current > voltages[length - 1] * factor) {
                            return 100;
                        }

                        if (current <= voltages[0] * factor) {
                            return 0;
                        }

                        for (let i = 0; i < length - 1; i++) {
                            if (current > voltages[i] * factor && current <= voltages[i + 1] * factor) {
                                return i + 1;
                            }
                        }

                        return 100;
                    }

                    const batteryLevel: BatteryLevel = {
                        percentage: percentage(currentVoltage, maxVoltage),
                        currentVoltage: currentVoltage,
                        maxVoltage: maxVoltage
                    }
                    this.emit(Events.BatteryLevel, batteryLevel)
                }
            });

            this.characteristics?.settingResult?.notify(true, (err) => {
                if (err) {
                    error(err)
                    return;
                }

                this.requestBatteryLevel()
                poll();
                success();
            });
        });
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

    private enableRealTimeData(): Promise<void> {
        return new Promise((success, error) => {
            const data = Buffer.from([0x0B, 0x01, 0x00, 0x00, 0x00, 0x00])
            this.characteristics?.settingUpdate?.write(data, true, (err) => {
                if (err) return error();
                success();
            });
        })
    }

    private requestBatteryLevel(): Promise<void> {
        return new Promise((success, error) => {
            const data = Buffer.from([0x08, 0x24, 0x00, 0x00, 0x00, 0x00])
            this.characteristics?.settingUpdate?.write(data, true, (err) => {
                if (err) return error();
                success();
            });
        })
    }

    private waitForCondition(current: { (): boolean; }, should: boolean): Promise<void> {
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
