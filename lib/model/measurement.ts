export interface Probe {
    number: number;
    connected: boolean
    temperature: number | undefined;
}

export interface Measurement {
    dateTime: Date,
    probes: Probe[],
}
