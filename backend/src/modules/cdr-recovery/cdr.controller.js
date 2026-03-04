const { buildPayload } = require("./cdr.service");

exports.buildCDR = async (req, res) => {

  const result = await buildPayload(
    global.cmsConnection.db,
    req.params.bookingId
  );

  if (result.error) {
    return res.status(404).json({
      success: false,
      error: result.error
    });
  }

  res.json({
    success: true,
    payload: result.payload,
    token: result.token,
    bookingStatus: result.bookingStatus
  });
};