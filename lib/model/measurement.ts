export interface Probe {
    number: number;
    temperature: number | undefined;
}

export interface Measurement {
    dateTime: Date,
    probes: Probe[],
}
