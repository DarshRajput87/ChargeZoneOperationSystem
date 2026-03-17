const axios = require("axios");
const { ObjectId } = require("mongodb");

exports.getTenants = async () => {

  const companies = global.cmsDb.collection("companies");

  const tenants = await companies.aggregate([
    {
      $addFields: {
        clean_ocpp_party_id: {
          $trim: {
            input: { $ifNull: ["$ocpp_party_id", ""] }
          }
        }
      }
    },
    {
      $match: {
        clean_ocpp_party_id: { $ne: "" }
      }
    },
    {
      $project: {
        name: 1,
        ocpp_party_id: "$clean_ocpp_party_id"
      }
    },
    {
      $sort: { name: 1 }
    }
  ]).toArray();

  return tenants;
};

exports.getOcpiClients = async ({ tenant_id } = {}) => {

  const ocpi = global.cmsDb.collection("ocpicredentials");

  const filter = {
    is_fleet_details_supported: true,
    deleted: false
  };

  if (tenant_id) {
    filter.tenant = new ObjectId(tenant_id);
  }

  return await ocpi
    .find(filter)
    .project({
      partyId: 1,
      partner_name: 1
    })
    .toArray();
};

exports.getExistingFleets = async ({ tenant_id }) => {
  try {
    const res = await axios.get(
      `https://api.chargecloud.net/ocpi/cpo/2.2/fleetdetails/${tenant_id}`
    );
    // Returns array of fleet objects; each has an initiator_name field
    return (res.data || []).map((f) => (f.initiator_name || "").trim().toLowerCase());
  } catch (err) {
    // If the endpoint 404s (no fleets yet) treat as empty list
    if (err?.response?.status === 404) return [];
    throw new Error(`Failed to fetch existing fleets: ${err?.response?.data?.message || err.message}`);
  }
};

exports.createFleet = async ({ tenant_id, fleets }) => {

  const companies = global.cmsDb.collection("companies");

  const tenant = await companies.findOne({
    _id: new ObjectId(tenant_id)
  });

  if (!tenant) {
    throw new Error(`Tenant not found for id: ${tenant_id}`);
  }

  const isHMIL = tenant.ocpp_party_id === "HYD";

  // Fetch already-existing fleet names from ChargeCloud (server-side safety net)
  const existingNames = await exports.getExistingFleets({ tenant_id });

  // Deduplicate within the incoming payload (case-insensitive)
  const seen = new Set();
  const uniqueFleets = [];
  const intraSkipped = [];
  for (const fleet of fleets) {
    const key = (fleet.initiator_name || "").trim().toLowerCase();
    if (seen.has(key)) {
      intraSkipped.push(fleet.initiator_name);
    } else {
      seen.add(key);
      uniqueFleets.push(fleet);
    }
  }

  // Filter out records that already exist in ChargeCloud
  const existingSet = new Set(existingNames);
  const newFleets = [];
  const alreadyExisting = [];
  for (const fleet of uniqueFleets) {
    const key = (fleet.initiator_name || "").trim().toLowerCase();
    if (existingSet.has(key)) {
      alreadyExisting.push(fleet.initiator_name);
    } else {
      newFleets.push(fleet);
    }
  }

  const created = [];
  const failed = [];

  for (const fleet of newFleets) {
    const payload = {
      initiated_by: "FLEET",
      initiator_name: fleet.initiator_name,
      price_per_unit: isHMIL ? null : fleet.price_per_unit,
      ocpiCredential: fleet.ocpiCredential,
      is_deleted: false
    };

    try {
      await axios.post(
        `https://api.chargecloud.net/ocpi/cpo/2.2/fleetdetails/${tenant_id}`,
        [payload]
      );
      created.push(fleet.initiator_name);
    } catch (err) {
      const status = err?.response?.status;
      const detail = err?.response?.data?.message || err?.response?.data?.error || "";
      // Treat 409 as already-existing (race condition)
      if (status === 409) {
        alreadyExisting.push(fleet.initiator_name);
      } else {
        failed.push({ name: fleet.initiator_name, reason: detail || `HTTP ${status || "network"}` });
      }
    }
  }

  if (failed.length > 0) {
    const details = failed.map((f) => `"${f.name}": ${f.reason}`).join("; ");
    throw new Error(`Some fleets failed to create: ${details}`);
  }

  return {
    message: "Fleet upload completed",
    created: created.length,
    skipped_existing: alreadyExisting.length,
    skipped_duplicates: intraSkipped.length,
    created_names: created,
    skipped_names: [...alreadyExisting, ...intraSkipped],
  };
};