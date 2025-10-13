const Joi = require("joi");

// Schema validasi untuk data sensor
const readingSchema = Joi.object({
  ipal_id: Joi.number().integer().required(),
  device_id: Joi.string().optional().default("unknown"),
  inlet: Joi.object({
    ph: Joi.number().min(0).max(14).required(),
    tds: Joi.number().min(0).max(2000).required(),
    turbidity: Joi.number().min(0).max(4000).required(),
    temperature: Joi.number().min(-10).max(60).required(),
  }).required(),
  outlet: Joi.object({
    ph: Joi.number().min(0).max(14).required(),
    tds: Joi.number().min(0).max(2000).required(),
    turbidity: Joi.number().min(0).max(4000).required(),
    temperature: Joi.number().min(-10).max(60).required(),
  }).required(),
});

// Fungsi validasi
exports.validateReadingData = (data) => {
  return readingSchema.validate(data, { abortEarly: false });
};
