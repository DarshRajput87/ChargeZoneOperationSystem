const StationService = require("./station.service");
const { searchStationsSchema, stationIdParamSchema } = require("./station.validation");

class StationController {
  constructor(db) {
    this.service = new StationService(db);

    this.searchStations = this.searchStations.bind(this);
    this.getChargers = this.getChargers.bind(this);
  }

  async searchStations(req, res, next) {
    try {
      const { error, value } = searchStationsSchema.validate(req.query);
      if (error) return res.status(400).json({ message: error.message });

      const result = await this.service.searchStations(value);
      res.json(result);
    } catch (err) {
      next(err);
    }
  }

  async getChargers(req, res, next) {
    try {
      const { error } = stationIdParamSchema.validate(req.params);
      if (error) return res.status(400).json({ message: error.message });

      const data = await this.service.getChargersByStation(req.params.stationId);
      res.json(data);
    } catch (err) {
      next(err);
    }
  }
}

module.exports = StationController;