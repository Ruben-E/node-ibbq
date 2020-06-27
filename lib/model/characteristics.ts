import {Characteristic} from "@abandonware/noble";

export interface Characteristics {
    settingResult: Characteristic | undefined;
    login: Characteristic | undefined;
    historicData: Characteristic | undefined;
    realTimeData: Characteristic | undefined;
    settingUpdate: Characteristic | undefined;
}
