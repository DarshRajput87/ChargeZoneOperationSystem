const express = require("express");
const router = express.Router();

const {
    getTenants,
    getOcpiClients,
    createFleet
} = require("./fleet.controller");

router.get("/tenants", getTenants);
router.get("/ocpi-clients", getOcpiClients);
router.post("/create", createFleet);

module.exports = router;