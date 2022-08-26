const Ajv = require('ajv-draft-04');

const ajv = new Ajv();
const configSchema = require('../src/config-schema.json');
const validate = ajv.compile(configSchema);

describe("valid configs", () => {
  const validConfigs = [
    ["empty config", {}],
    ["config with levels", {
      cat: "warn",
      dog: "info",
    }],
    ["config with level and sub-config", {
      cat: "warn",
      dog: {
        minLevel: "info"
      },
    }],
    ["config with levels and nested sub-configs", {
      cat: "warn",
      dog: {
        minLevel: "info",
        subConfig: {
          cat: "info",
          dog: {
            minLevel: "warn",
            subConfig: {
              cat: "info",
              dog: "info",
            },
          },
        },
      },
    }]
  ];

  validConfigs.forEach(([name, config]) => {
    test(name, () => {
      expect(validate(config)).toBeTruthy();
    });
  });
});

describe("invalid configs", () => {
  const invalidConfigs = [
    ["config with invalid levels", {
      cat: "cat",
      dog: "dog",
    }],
    ["config with sub-config missing minLevel", {
      cat: "warn",
      dog: {},
    }],
    ["config with sub-config with additional properties", {
      cat: "warn",
      dog: {
        minLevel: "info",
        additional: ":)"
      },
    }],
    ["config with sub-config with empty sub-config", {
      cat: "warn",
      dog: {
        minLevel: "info",
        subConfig: {},
      },
    }],
  ];

  invalidConfigs.forEach(([name, config]) => {
    test(name, () => {
      expect(validate(config)).toBeFalsy();
    });
  });
});
