const mongoose = require("mongoose");

const safeId = (val) => {
  if (!val) return null;
  if (val instanceof mongoose.Types.ObjectId) return val;
  if (mongoose.Types.ObjectId.isValid(val))
    return new mongoose.Types.ObjectId(val);
  return null;
};

const basePayload = {
  country_code: "IN",
  party_id: "STQ",
  id: "",
  start_date_time: "",
  end_date_time: null,
  session_id: "",
  cdr_token: {},
  charging_periods: [{
    start_date_time: "",
    dimensions: [{ type: "ENERGY", volume: "0" }],
    tariff_id: ""
  }],
  auth_method: "COMMAND",
  currency: "INR",
  tariffs: {
    country_code: "IN",
    party_id: "STQ",
    id: "",
    currency: "INR",
    elements: [{
      price_components: [{
        type: "ENERGY",
        price: 0,
        vat: 0,
        step_size: 1
      }]
    }],
    last_updated: ""
  },
  cdr_location: {
    name: "",
    city: "",
    address: "",
    state: "",
    country: "",
    coordinates: {},
    evse_uid: "",
    evse_id: ""
  },
  total_cost: { excl_vat: "0", incl_vat: "0" },
  remark: "Remote",
  total_energy: 0,
  total_time: 0,
  last_updated: "",
  authorization_reference: ""
};

exports.buildPayload = async (db, bookingId) => {

  // 🔵 SESSION
  const session = await db.collection("ocpiemspsessions")
    .findOne({ authorization_reference: bookingId });

  if (!session) {
    return {
      error: "OCPI session not found",
      bookingStatus: null
    };
  }

  // 🟢 BOOKING
  const booking = await db.collection("chargerbookings")
    .findOne({ _id: safeId(session.authorization_reference) });

  if (!booking) {
    return {
      error: "Booking not found",
      bookingStatus: null
    };
  }

  // 🟣 OCPI CREDENTIAL
  const credential = await db.collection("ocpicredentials")
    .findOne({ _id: safeId(session.ocpiCredential) });

  const rawToken = credential?.token || null;
  const encodedToken = rawToken;;

  // 🟣 TARIFF
  const tariff = await db.collection("tarrifs")
    .findOne({ _id: safeId(session.tariff_id) });

  // 🔌 CHARGER
  const charger = await db.collection("chargers")
    .findOne({ _id: safeId(booking?.charger) });

  // 🏢 STATION
  const station = await db.collection("chargingstations")
    .findOne({ external_location_id: String(session.location_id) });

  const payload = JSON.parse(JSON.stringify(basePayload));

  payload.party_id = session.party_id;
  payload.id = session.sessionId;
  payload.session_id = session.sessionId;
  payload.authorization_reference = session.authorization_reference;
  payload.start_date_time = session.start_date_time;
  payload.last_updated = session.last_updated;
  payload.cdr_token = session.cdr_token;

  payload.end_date_time =
    session.end_date_time
      ? new Date(session.end_date_time).toISOString()
      : null;

  payload.charging_periods[0].start_date_time =
    session.start_date_time;

  payload.charging_periods[0].dimensions[0].volume =
    String(session.kwh || 0);

  payload.total_energy = session.kwh || 0;

  payload.total_cost.excl_vat =
    String(session.total_cost?.[0]?.excl_vat || "0");

  payload.total_cost.incl_vat =
    String(session.total_cost?.[0]?.incl_vat || "0");

  payload.cdr_location.evse_uid = session.evse_uid;

  payload.cdr_location.evse_id =
    charger
      ? `${session.country_code}*${session.party_id}*${booking.charger}`
      : "EVSE_NOT_FOUND";

  payload.charging_periods[0].tariff_id =
    tariff?.external_tariff_id || "TARIFF_NOT_FOUND";

  payload.tariffs.id =
    tariff?.external_tariff_id || "TARIFF_NOT_FOUND";

  payload.tariffs.elements[0].price_components[0].price =
    tariff?.default_price_per_unit || 0;

  payload.tariffs.last_updated = session.last_updated;

  if (station) {
    payload.cdr_location.name = station.name;
    payload.cdr_location.city = station.city;
    payload.cdr_location.address = station.address;
    payload.cdr_location.state = station.state;
    payload.cdr_location.country = station.country;

    payload.cdr_location.coordinates = {
      latitude: station.location?.lat,
      longitude: station.location?.lng
    };
  }

  return {
    payload,
    token: encodedToken,
    bookingStatus: booking.status,
    error: null
  };
};