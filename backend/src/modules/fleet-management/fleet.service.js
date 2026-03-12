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

exports.getOcpiClients = async () => {

  const ocpi = global.cmsDb.collection("ocpicredentials");

  return await ocpi
    .find({
      is_fleet_details_supported: true,
      deleted: false
    })
    .project({
      partyId: 1,
      partner_name: 1
    })
    .toArray();
};

exports.createFleet = async ({ tenant_id, fleets }) => {

  const companies = global.cmsDb.collection("companies");

  const tenant = await companies.findOne({
    _id: new ObjectId(tenant_id)
  });

  const isHMIL = tenant.ocpp_party_id === "HYD";

  for (const fleet of fleets) {

    const payload = {
      initiated_by: "FLEET",
      initiator_name: fleet.initiator_name,
      price_per_unit: isHMIL ? null : fleet.price_per_unit,
      ocpiCredential: fleet.ocpiCredential,
      is_deleted: false
    };

    await axios.post(
      `https://api.chargecloud.net/ocpi/cpo/2.2/fleetdetails/${tenant_id}`,
      [payload]
    );
  }

  return { message: "Fleet Created Successfully" };
};