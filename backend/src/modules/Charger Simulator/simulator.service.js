const wsClient = require("./engine/websocket.client");
const ocpp = require("./engine/ocpp.builder");
const meter = require("./engine/meter.generator");
const faults = require("./engine/fault.generator");
const FaultModel = require("./simulator.model");
const session = require("./engine/session.manager");

let meterInterval = null;

let logs = [];

const pushLog = (type, message) => {
    logs.unshift({
        time: new Date().toLocaleTimeString(),
        type,
        message: typeof message === "string"
            ? message
            : JSON.stringify(message, null, 2)
    });

    // keep only last 200 logs
    if (logs.length > 200) logs.pop();
};

exports.getLogs = () => logs;

/* ───────── FAULT SCENARIO SERVICES ───────── */

exports.listFaultScenarios = async () => {
    return await FaultModel.find().sort({ createdAt: -1 });
};

exports.createFaultScenario = async (data) => {
    const { name, faultTypes, recordCount, filters } = data;

    const generatedData = faults.generateFaultData(faultTypes, recordCount || 10);

    const scenario = new FaultModel({
        name,
        faultTypes,
        recordCount: recordCount || 10,
        filters,
        generatedData
    });

    return await scenario.save();
};

exports.sendFaultScenario = async (id) => {
    const scenario = await FaultModel.findById(id);

    if (!scenario) throw new Error("Fault scenario not found");

    for (const record of scenario.generatedData) {

        const payload = {
            connectorId: scenario.filters?.connectorId || 1,
            transactionId: scenario.filters?.transactionId || session.transactionId,
            meterValue: [record]
        };

        wsClient.send(
            ocpp.build("MeterValues", payload)
        );

    }
};


exports.connect = async (url) => {

    await wsClient.connect(url);

    pushLog("SYS", `✅ Connected to: ${url}`);

    // ── Register listeners BEFORE sending anything ──────────────────────
    // so we never miss a fast CSMS response
    wsClient.onClose((code, reason) => {
        pushLog("ERR", `🔌 WebSocket closed — code: ${code}, reason: ${reason}`);
    });

    wsClient.onMessage((msg) => {

        // Log every incoming message from CSMS
        pushLog("IN", msg);

        const messageType = msg[0];
        const messageId = msg[1];

        // -------------------------
        // CALL from CSMS
        // ─────────────────────────

        if (messageType === 2) {

            const action = msg[2];
            const payload = msg[3];

            console.log("OCPP CALL:", action);

            // RemoteStartTransaction
            if (action === "RemoteStartTransaction") {

                session.setIdTag(payload.idTag);

                const reply = [3, messageId, { status: "Accepted" }];
                pushLog("OUT", reply);
                wsClient.send(reply);

                return;
            }

            // RemoteStopTransaction
            if (action === "RemoteStopTransaction") {

                const reply = [3, messageId, { status: "Accepted" }];
                pushLog("OUT", reply);
                wsClient.send(reply);

                return;
            }

            // DataTransfer
            if (action === "DataTransfer") {

                const reply = [3, messageId, { status: "Accepted" }];
                pushLog("OUT", reply);
                wsClient.send(reply);

                return;
            }

            // Unknown command
            const reply = [3, messageId, {}];
            pushLog("OUT", reply);
            wsClient.send(reply);

            return;
        }

        // -------------------------
        // CALLRESULT from CSMS
        // -------------------------
        if (messageType === 3) {

            const payload = msg[2];

            // BootNotification accepted
            if (payload?.status === "Accepted" && payload?.currentTime) {
                pushLog("SYS", `🟢 BootNotification Accepted — CSMS time: ${payload.currentTime}`);
            }

            if (payload?.transactionId) {

                session.setTransactionId(payload.transactionId);
                pushLog("SYS", `🆔 Transaction ID set: ${payload.transactionId}`);
                console.log("Transaction ID:", payload.transactionId);

            }

            return;
        }


        // -------------------------
        // CALLERROR from CSMS
        // -------------------------
        if (messageType === 4) {

            pushLog("ERR", msg);
            console.error("OCPP ERROR:", msg);

            return;
        }

    });

    // OCPP 1.6: BootNotification is the mandatory first message
    // Sent AFTER listeners are registered so the CSMS response is always captured
    const bootFrame = ocpp.build("BootNotification", {
        chargePointVendor: "ChargeZone",
        chargePointModel: "CZ-SIMULATOR-01",
        chargePointSerialNumber: "SIM-2025-001",
        firmwareVersion: "1.0.0",
        iccid: "",
        imsi: ""
    });
    pushLog("OUT", bootFrame);
    wsClient.send(bootFrame);

    return { status: "connected" };

};


/* ───────── MANUAL METER (from frontend form) ───────── */
exports.sendManualMeter = (data) => {

    const payload = {
        connectorId: 1,
        transactionId: session.transactionId,
        meterValue: [
            {
                timestamp: new Date().toISOString(),
                sampledValue: [
                    {
                        context: "Sample.Periodic",
                        location: "Outlet",
                        measurand: "Energy.Active.Import.Register",
                        unit: "Wh",
                        value: data.energy || "0"
                    },
                    {
                        context: "Sample.Periodic",
                        location: "Outlet",
                        measurand: "SoC",
                        unit: "Percent",
                        value: data.soc || "0"
                    },
                    {
                        context: "Sample.Periodic",
                        location: "Outlet",
                        measurand: "Voltage",
                        unit: "V",
                        value: data.voltage || "0"
                    },
                    {
                        context: "Sample.Periodic",
                        location: "Outlet",
                        measurand: "Current.Import",
                        unit: "A",
                        value: data.current || "0"
                    },
                    {
                        context: "Sample.Periodic",
                        location: "Outlet",
                        measurand: "Power.Active.Import",
                        unit: "W",
                        value: data.power || "0"
                    },
                    {
                        context: "Sample.Periodic",
                        location: "Body",
                        measurand: "Temperature",
                        unit: "Celcius",
                        value: data.temperature || "0"
                    }
                ]
            }
        ]
    };

    const frame = ocpp.build("MeterValues", payload);
    pushLog("OUT", frame);
    wsClient.send(frame);

};

exports.sendStatusNotification = (status) => {

    const payload = {

        connectorId: 1,
        status: status,   // Available | Unavailable | Preparing
        errorCode: "NoError",
        timestamp: new Date().toISOString(),
        info: "",
        vendorId: "",
        vendorErrorCode: ""

    };

    const frame = ocpp.build("StatusNotification", payload);
    pushLog("OUT", frame);
    wsClient.send(frame);

};

exports.startTransaction = () => {

    const payload = {

        connectorId: 1,
        idTag: session.idTag,
        timestamp: new Date().toISOString(),
        meterStart: 5050

    };

    const frame = ocpp.build("StartTransaction", payload);
    pushLog("OUT", frame);
    wsClient.send(frame);

};

exports.sendCustomMeterValues = (data) => {

    const {
        transactionId,
        values
    } = data;

    const payload = {

        connectorId: 1,

        transactionId,

        meterValue: [
            {
                timestamp: new Date().toISOString(),

                sampledValue: [

                    {
                        context: "Sample.Periodic",
                        location: "Outlet",
                        measurand: "Energy.Active.Import.Register",
                        unit: "Wh",
                        value: values.energy
                    },
                    {
                        context: "Sample.Periodic",
                        location: "Outlet",
                        measurand: "Energy.Active.Import.Interval",
                        unit: "Wh",
                        value: values.interval
                    },
                    {
                        context: "Sample.Periodic",
                        location: "Outlet",
                        measurand: "SoC",
                        unit: "Percent",
                        value: values.soc
                    },
                    {
                        context: "Sample.Periodic",
                        location: "Outlet",
                        measurand: "Voltage",
                        unit: "V",
                        value: values.voltage
                    },
                    {
                        context: "Sample.Periodic",
                        location: "Outlet",
                        measurand: "Current.Import",
                        unit: "A",
                        value: values.current
                    },
                    {
                        context: "Sample.Periodic",
                        location: "Outlet",
                        measurand: "Power.Active.Import",
                        unit: "W",
                        value: values.power
                    },
                    {
                        context: "Sample.Periodic",
                        location: "Outlet",
                        measurand: "Current.Offered",
                        unit: "A",
                        value: values.currentOffered
                    },
                    {
                        context: "Sample.Periodic",
                        location: "Outlet",
                        measurand: "Power.Offered",
                        unit: "W",
                        value: values.powerOffered
                    },
                    {
                        context: "Sample.Periodic",
                        location: "Outlet",
                        measurand: "Voltage.Requested",
                        unit: "V",
                        value: values.voltageRequested
                    },
                    {
                        context: "Sample.Periodic",
                        location: "Outlet",
                        measurand: "Current.Requested",
                        unit: "A",
                        value: values.currentRequested
                    },
                    {
                        context: "Sample.Periodic",
                        location: "Body",
                        measurand: "Temperature",
                        unit: "Celcius",
                        value: values.bodyTemp
                    },
                    {
                        context: "Sample.Periodic",
                        location: "Cable",
                        measurand: "Temperature",
                        unit: "Celcius",
                        value: values.cableTemp
                    },
                    {
                        context: "Sample.Periodic",
                        location: "Outlet",
                        measurand: "Temperature",
                        unit: "Celcius",
                        value: values.outletTemp
                    }

                ]
            }
        ]

    };

    wsClient.send(
        ocpp.build("MeterValues", payload)
    );

};

exports.stopTransaction = () => {

    const payload = {

        transactionId: session.transactionId,
        idTag: session.idTag,
        timestamp: new Date().toISOString(),
        meterStop: 7000,
        reason: "Local"

    };

    const frame = ocpp.build("StopTransaction", payload);
    pushLog("OUT", frame);
    wsClient.send(frame);

};