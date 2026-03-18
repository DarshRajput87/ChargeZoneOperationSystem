const { randomUUID } = require("crypto");

exports.build = (action, payload) => {

    return [
        2,
        randomUUID(),
        action,
        payload
    ];

};