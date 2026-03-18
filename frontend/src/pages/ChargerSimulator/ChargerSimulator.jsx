import { useState, useEffect } from "react";

import {
    connectCharger,
    sendStatus,
    startTransaction,
    stopTransaction,
    sendMeterValues,
    createFaultScenario,
    getFaultScenarios,
    sendFaultScenario,
    getLogs
} from "../ChargerSimulator/simulatorService";

import "./ChargerSimulator.css";

export default function ChargerSimulator() {

    const [wsUrl, setWsUrl] = useState("");
    const [status, setStatus] = useState("Available");
    const [logs, setLogs] = useState([]);
    const [faultName, setFaultName] = useState("");
    const [recordCount, setRecordCount] = useState(10);
    const [faultTypes, setFaultTypes] = useState([]);
    const [faultList, setFaultList] = useState([]);

    const [meterData, setMeterData] = useState({
        energy: "5500", soc: "72", voltage: "400",
        current: "16", power: "6400", temperature: "32"
    });

    const faultOptions = [
        "NEGATIVE_METER", "SOC_INVALID", "INVALID_TIME",
        "TIME_NO_UNIT", "ABNORMAL_UNIT"
    ];

    const addLog = (type, message) => setLogs((prev) => [{
        time: new Date().toLocaleTimeString(),
        type,
        message: typeof message === "string" ? message : JSON.stringify(message, null, 2)
    }, ...prev]);

    const handleConnect = async () => { await connectCharger(wsUrl); addLog("OUT", "Connect WebSocket"); };
    const handleStatus = async () => { await sendStatus(status); addLog("OUT", `StatusNotification → ${status}`); };
    const handleStart = async () => { await startTransaction(); addLog("OUT", "StartTransaction"); };
    const handleStop = async () => { await stopTransaction(); addLog("OUT", "StopTransaction"); };
    const handleSendMeter = async () => { await sendMeterValues(meterData); addLog("OUT", { action: "MeterValues", payload: meterData }); };

    const toggleFault = (fault) =>
        setFaultTypes(prev =>
            prev.includes(fault) ? prev.filter(f => f !== fault) : [...prev, fault]
        );

    const handleCreateFault = async () => {
        await createFaultScenario({ name: faultName, faultTypes, recordCount });
        addLog("SYSTEM", "Fault scenario created");
        loadFaults();
    };

    const loadFaults = async () => { const res = await getFaultScenarios(); setFaultList(res.data); };
    const refreshLogs = async () => { const res = await getLogs(); setLogs(res.data); };

    useEffect(() => {
        loadFaults();
        const interval = setInterval(refreshLogs, 2000);
        return () => clearInterval(interval);
    }, []);

    return (
        <div className="cs-root">
            <div className="cs-layout">

                {/* ═══════════════════════════════
                    LEFT — scrollable control panel
                ═══════════════════════════════ */}
                <div className="cs-left">

                    {/* Connection */}
                    <div className="cs-card">
                        <div className="cs-card-header">
                            <span className="cs-card-icon">🔌</span>
                            <h3>Connection</h3>
                        </div>
                        <div className="cs-field">
                            <label>WebSocket URL</label>
                            <input
                                placeholder="ws://localhost:9000/ocpp/CP001"
                                value={wsUrl}
                                onChange={(e) => setWsUrl(e.target.value)}
                            />
                        </div>
                        <button className="cs-btn cs-btn-primary" onClick={handleConnect}>
                            Connect
                        </button>
                    </div>

                    {/* Status Notification */}
                    <div className="cs-card">
                        <div className="cs-card-header">
                            <span className="cs-card-icon">📡</span>
                            <h3>Status Notification</h3>
                        </div>
                        <div className="cs-field">
                            <label>Charger Status</label>
                            <select value={status} onChange={(e) => setStatus(e.target.value)}>
                                <option value="Available">Available</option>
                                <option value="Unavailable">Unavailable</option>
                                <option value="Preparing">Preparing</option>
                            </select>
                        </div>
                        <button className="cs-btn cs-btn-primary" onClick={handleStatus}>
                            Send Status
                        </button>
                    </div>

                    {/* Charging Controls */}
                    <div className="cs-card">
                        <div className="cs-card-header">
                            <span className="cs-card-icon">⚡</span>
                            <h3>Charging Controls</h3>
                        </div>
                        <div className="cs-btn-row">
                            <button className="cs-btn cs-btn-green" onClick={handleStart}>
                                Start Transaction
                            </button>
                            <button className="cs-btn cs-btn-danger" onClick={handleStop}>
                                Stop Transaction
                            </button>
                        </div>
                    </div>

                    {/* Manual Meter Values */}
                    <div className="cs-card">
                        <div className="cs-card-header">
                            <span className="cs-card-icon">📊</span>
                            <h3>Manual Meter Values</h3>
                            <span className="cs-tx-badge">TX</span>
                        </div>
                        <div className="cs-meter-grid">
                            <div className="cs-field">
                                <label>Energy <span className="cs-unit">Wh</span></label>
                                <input placeholder="e.g. 5500" value={meterData.energy}
                                    onChange={(e) => setMeterData({ ...meterData, energy: e.target.value })} />
                            </div>
                            <div className="cs-field">
                                <label>State of Charge <span className="cs-unit">%</span></label>
                                <input placeholder="0–100" value={meterData.soc}
                                    onChange={(e) => setMeterData({ ...meterData, soc: e.target.value })} />
                            </div>
                            <div className="cs-field">
                                <label>Voltage <span className="cs-unit">V</span></label>
                                <input placeholder="e.g. 400" value={meterData.voltage}
                                    onChange={(e) => setMeterData({ ...meterData, voltage: e.target.value })} />
                            </div>
                            <div className="cs-field">
                                <label>Current <span className="cs-unit">A</span></label>
                                <input placeholder="e.g. 16" value={meterData.current}
                                    onChange={(e) => setMeterData({ ...meterData, current: e.target.value })} />
                            </div>
                            <div className="cs-field">
                                <label>Power <span className="cs-unit">W</span></label>
                                <input placeholder="e.g. 6400" value={meterData.power}
                                    onChange={(e) => setMeterData({ ...meterData, power: e.target.value })} />
                            </div>
                            <div className="cs-field">
                                <label>Temperature <span className="cs-unit">°C</span></label>
                                <input placeholder="e.g. 32" value={meterData.temperature}
                                    onChange={(e) => setMeterData({ ...meterData, temperature: e.target.value })} />
                            </div>
                        </div>
                        <button className="cs-btn cs-btn-primary" onClick={handleSendMeter}>
                            Send MeterValues
                        </button>
                    </div>

                    {/* Fault Generator */}
                    <div className="cs-card">
                        <div className="cs-card-header">
                            <span className="cs-card-icon">⚠️</span>
                            <h3>Create Fault Scenario</h3>
                        </div>
                        <div className="cs-field-row">
                            <div className="cs-field cs-field-grow">
                                <label>Scenario Name</label>
                                <input placeholder="e.g. NegativeMeter_Test" value={faultName}
                                    onChange={(e) => setFaultName(e.target.value)} />
                            </div>
                            <div className="cs-field cs-field-fixed">
                                <label>Record Count</label>
                                <input type="number" value={recordCount}
                                    onChange={(e) => setRecordCount(e.target.value)} />
                            </div>
                        </div>
                        <div className="cs-field">
                            <label>Fault Types</label>
                            <div className="cs-fault-pills">
                                {faultOptions.map((fault) => (
                                    <button
                                        key={fault}
                                        type="button"
                                        className={`cs-pill ${faultTypes.includes(fault) ? "cs-pill-active" : ""}`}
                                        onClick={() => toggleFault(fault)}
                                    >
                                        {fault}
                                    </button>
                                ))}
                            </div>
                        </div>
                        <button className="cs-btn cs-btn-primary" onClick={handleCreateFault}>
                            Generate Fault Data
                        </button>
                    </div>

                    {/* Stored Faults */}
                    <div className="cs-card">
                        <div className="cs-card-header">
                            <span className="cs-card-icon">🗂️</span>
                            <h3>Stored Fault Scenarios</h3>
                        </div>
                        {faultList.length === 0
                            ? <p className="cs-empty">No scenarios saved yet.</p>
                            : faultList.map((fault) => (
                                <div key={fault._id} className="cs-fault-item">
                                    <div className="cs-fault-info">
                                        <span className="cs-fault-name">{fault.name}</span>
                                        <span className="cs-fault-types">{fault.faultTypes.join(", ")}</span>
                                    </div>
                                    <button className="cs-btn cs-btn-sm cs-btn-ghost"
                                        onClick={() => sendFaultScenario(fault._id)}>
                                        Send
                                    </button>
                                </div>
                            ))
                        }
                    </div>

                </div>{/* /cs-left */}

                {/* ═══════════════════════════════
                    RIGHT — sticky OCPP console
                ═══════════════════════════════ */}
                <div className="cs-right">
                    <div className="cs-card cs-console-card">
                        <div className="cs-card-header">
                            <span className="cs-live-dot" />
                            <h3>OCPP Console</h3>
                        </div>
                        <div className="cs-log-window">
                            {logs.length === 0 && (
                                <p className="cs-empty">Waiting for messages…</p>
                            )}
                            {logs.map((log, i) => (
                                <div key={i} className={`cs-log cs-log-${log.type.toLowerCase()}`}>
                                    <div className="cs-log-meta">
                                        <span className="cs-log-time">{log.time}</span>
                                        <span className="cs-log-tag">{log.type}</span>
                                    </div>
                                    <pre className="cs-log-body">{log.message}</pre>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

            </div>
        </div>
    );
}