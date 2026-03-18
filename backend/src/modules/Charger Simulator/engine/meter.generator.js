class MeterGenerator {

    constructor() {
        this.energy = 1000;
    }

    generate() {

        this.energy += Math.floor(Math.random() * 20);

        return {

            timestamp: new Date().toISOString(),

            sampledValue: [

                {
                    measurand: "Energy.Active.Import.Register",
                    unit: "Wh",
                    value: this.energy.toString()
                },

                {
                    measurand: "Power.Active.Import",
                    unit: "W",
                    value: "7000"
                },

                {
                    measurand: "SoC",
                    unit: "Percent",
                    value: (20 + Math.random() * 60).toFixed(0)
                }

            ]

        };

    }

}

module.exports = new MeterGenerator();