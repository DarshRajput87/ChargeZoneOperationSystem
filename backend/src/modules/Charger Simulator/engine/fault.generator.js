const meterGenerator = require("./meter.generator");

class FaultGenerator {

    generateFaultData(faultTypes, count) {

        const records = [];

        for (let i = 0; i < count; i++) {

            let data = meterGenerator.generate();

            faultTypes.forEach(type => {

                if (type === "NEGATIVE_METER") {

                    data.sampledValue[0].value = "-100";

                }

                if (type === "SOC_INVALID") {

                    data.sampledValue[2].value = "120";

                }

                if (type === "INVALID_TIME") {

                    data.timestamp = "2035-01-01T00:00:00Z";

                }

                if (type === "TIME_NO_UNIT") {

                    data.sampledValue[0].value = "0";

                }

                if (type === "ABNORMAL_UNIT") {

                    data.sampledValue[0].value =
                        (Math.random() * 100000).toFixed(0);

                }

            });

            records.push(data);

        }

        return records;

    }

}

module.exports = new FaultGenerator();