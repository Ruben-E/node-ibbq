function Measurement (probe, temperature) {
    this.probe = probe;
    this.temperature = temperature;
}

Measurement.prototype.toString = function () {
    return JSON.stringify({
        probe: this.probe,
        temperature: this.temperature
    });
};

module.exports = Measurement;
