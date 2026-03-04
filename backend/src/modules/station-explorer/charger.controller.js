exports.getChargers = async (req, res) => {
  try {
    const cmsDB = global.cmsConnection.db;

    const {
      state,
      isExternal,
      sort = "desc",
      page = 1,
      limit = 20
    } = req.query;

    const skip = (Number(page) - 1) * Number(limit);

    let matchStage = {
      is_deleted: { $ne: true }
    };

    if (isExternal !== undefined) {
      matchStage.is_external_charger = isExternal === "true";
    }

    const pipeline = [
      { $match: matchStage },

      // Join charging station
      {
        $lookup: {
          from: "chargingstations",
          localField: "charging_station",
          foreignField: "_id",
          as: "station"
        }
      },
      { $unwind: "$station" },

      // Filter by state if provided
      ...(state ? [{
        $match: { "station.state": state }
      }] : []),

      // Join company
      {
        $lookup: {
          from: "companies",
          localField: "tenant",
          foreignField: "_id",
          as: "company"
        }
      },
      { $unwind: "$company" },

      // Extract numeric part from charger_id
     {
  $addFields: {
    numericPart: {
      $convert: {
        input: {
          $ifNull: [
            {
              $getField: {
                field: "match",
                input: {
                  $regexFind: {
                    input: "$charger_id",
                    regex: "[0-9]+"
                  }
                }
              }
            },
            null
          ]
        },
        to: "int",
        onError: null,
        onNull: null
      }
    }
  }
},

      {
        $project: {
          charger_id: 1,
          charger_status: 1,
          access_type: 1,
          is_external_charger: 1,
          "station.state": 1,
          "station.city": 1,
          tenant_name: "$company.name",
          ocpp_party_id: "$company.ocpp_party_id",
          numericPart: 1
        }
      },

      {
        $sort: {
  numericPart: sort === "asc" ? 1 : -1,
  charger_id: sort === "asc" ? 1 : -1
}
      },

      { $skip: skip },
      { $limit: Number(limit) }
    ];

    const data = await cmsDB.collection("chargers").aggregate(pipeline).toArray();

    res.json({
      success: true,
      data
    });

  } catch (error) {
  console.error("Charger API Error:", error);
  res.status(500).json({
    success: false,
    error: error.message
  });
}
};