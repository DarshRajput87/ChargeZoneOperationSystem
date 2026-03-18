class SessionManager {

    constructor() {

        this.idTag = null;
        this.transactionId = null;

    }

    setIdTag(idTag) {
        this.idTag = idTag;
    }

    setTransactionId(id) {
        this.transactionId = id;
    }

}

module.exports = new SessionManager();