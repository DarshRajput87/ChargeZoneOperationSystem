const Joi = require("joi");

/* ======================================================
   🔎 SEARCH + FILTER QUERY VALIDATION
   - search optional
   - status optional
   - state optional
   - page + limit safe defaults
====================================================== */

exports.searchStationsSchema = Joi.object({
  search: Joi.string().allow("").max(100),
  status: Joi.string().allow(""),
  state: Joi.string().allow(""),

  isExternal: Joi.string()
    .valid("true", "false")
    .optional(),

  page: Joi.number().min(1).default(1),
  limit: Joi.number().min(1).max(50).default(10)
});

/* ======================================================
   🔌 Station ID Param Validation
====================================================== */

exports.stationIdParamSchema = Joi.object({
  stationId: Joi.string().length(24).required(),
});