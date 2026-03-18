const mongoose = require("mongoose");

const FaultScenarioSchema = new mongoose.Schema({

    name: {
        type: String,
        required: true
    },

    faultTypes: [{
        type: String
    }],

    recordCount: {
        type: Number,
        default: 10
    },

    filters: {
        connectorId: Number,
        transactionId: Number
    },

    generatedData: [{
        timestamp: String,
        sampledValue: [{
            measurand: String,
            unit: String,
            value: String
        }]
    }],

    createdAt: {
        type: Date,
        default: Date.now
    }

});

module.exports = mongoose.model(
    "charger_fault_scenarios",
    FaultScenarioSchema
);