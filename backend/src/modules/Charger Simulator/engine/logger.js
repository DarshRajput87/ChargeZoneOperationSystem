class Logger {

    log(message) {

        const time = new Date().toISOString();

        console.log(`[SIMULATOR ${time}] ${message}`);

    }

}

module.exports = new Logger();