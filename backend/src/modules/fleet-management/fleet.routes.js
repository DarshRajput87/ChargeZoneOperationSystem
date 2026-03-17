const express = require("express");
const router = express.Router();

const {
    getTenants,
    getOcpiClients,
    getExistingFleets,
    createFleet
} = require("./fleet.controller");

router.get("/tenants", getTenants);
router.get("/ocpi-clients", getOcpiClients);
router.get("/existing-fleets", getExistingFleets);
router.post("/create", createFleet);

module.exports = router;