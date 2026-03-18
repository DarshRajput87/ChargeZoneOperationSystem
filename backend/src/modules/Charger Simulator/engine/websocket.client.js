const WebSocket = require("ws");

class WebSocketClient {

    constructor() {
        this.ws = null;
        this.listeners = [];
        this.closeListeners = [];
    }

    connect(url) {

        // Reset listeners on every new connect (prevent accumulation across reconnects)
        this.listeners = [];
        this.closeListeners = [];

        return new Promise((resolve, reject) => {

            this.ws = new WebSocket(url, ["ocpp1.6"]);

            // Capture the specific socket instance for this connect() call
            // so that when an OLD socket closes due to reconnect, it doesn't
            // incorrectly fire the new connection's close listeners.
            const thisSocket = this.ws;

            thisSocket.on("open", () => {

                console.log("Connected to:", url);
                resolve(true);

            });

            thisSocket.on("message", (data) => {

                const msg = JSON.parse(data.toString());

                console.log("OCPP MESSAGE:", msg);

                this.listeners.forEach(fn => fn(msg));

            });

            thisSocket.on("error", (err) => {
                console.error("WebSocket error:", err.message);
                reject(err);
            });

            thisSocket.on("close", (code, reason) => {
                const reasonStr = reason?.toString() || "no reason given";
                console.log(`WebSocket closed — code: ${code}, reason: ${reasonStr}`);

                // Only fire listeners if this is still the ACTIVE connection.
                // If user reconnected, this.ws will have been replaced — ignore the old close.
                if (this.ws !== thisSocket) {
                    console.log("(Old WebSocket closed after reconnect — ignored)");
                    return;
                }

                this.closeListeners.forEach(fn => fn(code, reasonStr));
            });

        });

    }


    onMessage(fn) {
        this.listeners.push(fn);
    }

    onClose(fn) {
        this.closeListeners.push(fn);
    }

    send(data) {

        if (!this.ws) return;

        this.ws.send(JSON.stringify(data));

    }

}

module.exports = new WebSocketClient();
