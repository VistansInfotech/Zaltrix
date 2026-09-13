/**
 * Stand-in for binary assets Metro bundles but Jest cannot parse (.wav, .tflite).
 * `require()` of an asset yields a numeric registry id at runtime, so a number
 * keeps the call sites honest.
 */
module.exports = 1;
