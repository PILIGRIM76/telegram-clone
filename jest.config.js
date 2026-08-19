const { createDefaultPreset } = require("ts-jest");

const tsJestTransformCfg = createDefaultPreset().transform;

module.exports = {
  testEnvironment: "node",
  transform: {
    ...tsJestTransformCfg,
  },
  transformIgnorePatterns: [
    "node_modules/(?!(otplib|@otplib|@scure|fp-ts)/)",
  ],
};
