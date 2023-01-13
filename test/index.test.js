const Logger = require("bunyan");
const CategoryLogger = require("../src");

const bunyanEmitSpy = jest
  .spyOn(Logger.prototype, "_emit")
  .mockReturnValue("mocked");

/**
 * Used to ensure that the config works whether it is provided via config or via
 * configProvider.
 */
function buildLoggerOptions(options) {
  return [
    options,
    {
      ...options,
      config: undefined,
      configProvider: {
        getConfig() {
          return options.config;
        }
      }
    }
  ];
}

test.each(buildLoggerOptions({
  config: {
    mySpecialCategory: "warn",
  },
  name: "testing",
}))("logs under the min level of their category are not emitted", (options) => {
  const logger = CategoryLogger.createLogger(options);

  logger.info({ category: "mySpecialCategory" }, "should not be logged");
  logger.error({ category: "mySpecialCategory" }, "should be logged");

  expect(bunyanEmitSpy).toHaveBeenCalledTimes(1);
  expect(bunyanEmitSpy).toHaveBeenCalledWith(
    expect.objectContaining({
      category: "mySpecialCategory",
      msg: "should be logged",
    }),
    undefined
  );
});

test.each(buildLoggerOptions({
  config: {},
  name: "testing",
}))("logs without an explicit category are logged with their level category", (options) => {
  const logger = new CategoryLogger(options);

  logger.info('should be logged with category "info"');

  expect(bunyanEmitSpy).toHaveBeenCalledTimes(1);
  expect(bunyanEmitSpy).toHaveBeenCalledWith(
    expect.objectContaining({
      category: "info",
      msg: 'should be logged with category "info"',
    }),
    undefined
  );
});

test.each(buildLoggerOptions({
  config: {
    mySpecialCategory: "error",
  },
  category: "mySpecialCategory",
  name: "testing",
}))("category loggers can be created with a default category", (options) => {
  const logger = new CategoryLogger(options);

  logger.warn("should not be logged");
  logger.error("should be logged");

  expect(bunyanEmitSpy).toHaveBeenCalledTimes(1);
  expect(bunyanEmitSpy).toHaveBeenCalledWith(
    expect.objectContaining({
      category: "mySpecialCategory",
      msg: "should be logged",
    }),
    undefined
  );
});

test.each(buildLoggerOptions({
  config: {
    mySpecialCategory: "warn",
  },
  name: "testing",
}))("log level functions accept category and log arguments constructor", (options) => {
  const logger = new CategoryLogger(options);

  const infoLogArguments = jest.fn();
  logger.info("mySpecialCategory", infoLogArguments);

  const warnLogArguments = jest
    .fn()
    .mockReturnValue([{ specialProp: 123 }, "warning message"]);
  logger.warn("mySpecialCategory", warnLogArguments);

  logger.warn("mySpecialCategory", () => ["only the message argument"]);

  expect(infoLogArguments).not.toHaveBeenCalled();
  expect(warnLogArguments).toHaveBeenCalledTimes(1);
  expect(bunyanEmitSpy).toHaveBeenCalledTimes(2);
  expect(bunyanEmitSpy).toHaveBeenCalledWith(
    expect.objectContaining({
      category: "mySpecialCategory",
      specialProp: 123,
      msg: "warning message",
    }),
    undefined
  );
  expect(bunyanEmitSpy).toHaveBeenCalledWith(
    expect.objectContaining({
      category: "mySpecialCategory",
      msg: "only the message argument",
    }),
    undefined
  );
});

test.each(buildLoggerOptions({
  name: "testing",
  config: {},
}))("log arguments constructor works with child loggers", (options) => {
  const logger = new CategoryLogger(options);

  const childLogger = logger.child({ myChildProperty: 123 });

  childLogger.info("myCategory", () => ["child message"]);

  expect(bunyanEmitSpy).toHaveBeenCalledTimes(1);
  expect(bunyanEmitSpy).toHaveBeenCalledWith(
    expect.objectContaining({
      category: "myCategory",
      myChildProperty: 123,
      msg: "child message",
    }),
    undefined
  );
});

describe("logger with nested configs", () => {
  const loggerOptions = buildLoggerOptions({
    name: "testing",
    config: {
      Timing: {
        minLevel: "warn",
        subConfig: {
          DynamoDb: "info",
          Neptune: {
            minLevel: "warn",
            subConfig: {
              Vertices: "info",
            },
          },
        },
      },
    },
  });

  test.each(loggerOptions)("matches most specific category in config", (options) => {
    const logger = new CategoryLogger(options);
    logger.info({ category: "Timing.DynamoDb" }, "should be logged");
    expect(bunyanEmitSpy).toHaveBeenCalledTimes(1);
    expect(bunyanEmitSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        category: "Timing.DynamoDb",
        msg: "should be logged",
      }),
      undefined
    );
  });

  test.each(loggerOptions)("matches parent config if child cannot be found", (options) => {
    const logger = new CategoryLogger(options);
    logger.info({ category: "Timing.Neptune" }, "should not be logged");
    logger.warn({ category: "Timing.Neptune" }, "should be logged");
    logger.info({ category: "Timing.Neptune.Edges" }, "should not be logged");
    logger.info({ category: "Timing.Neptune.Vertices" }, "should be logged");
    expect(bunyanEmitSpy).toHaveBeenCalledTimes(2);
    expect(bunyanEmitSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        category: "Timing.Neptune",
        msg: "should be logged",
      }),
      undefined
    );
    expect(bunyanEmitSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        category: "Timing.Neptune.Vertices",
        msg: "should be logged",
      }),
      undefined
    );
  });

  test.each(buildLoggerOptions({
    name: "testing",
    config: {
      Timing: {
        minLevel: "warn",
        subConfig: {
          Neptune: {
            i: "pull up",
          },
        },
      },
    },
  }))("matches parent config if child is invalid", (options) => {
    const logger = new CategoryLogger(options);

    logger.info({ category: "Timing.Neptune" }, "should not be logged");
    logger.warn({ category: "Timing.Neptune" }, "should be logged");

    expect(bunyanEmitSpy).toHaveBeenCalledTimes(1);
    expect(bunyanEmitSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        category: "Timing.Neptune",
        msg: "should be logged",
      }),
      undefined
    );
  });

  test.each(buildLoggerOptions({
    name: "testing",
    config: {
      Timing: {
        minLevel: "warn",
        subConfig: {
          DynamoDb: {
            minLevel: "info",
          },
        },
      },
    },
  }))("matches config object without subconfig", (options) => {
    const logger = new CategoryLogger(options);

    logger.info({ category: "Timing.DynamoDb" }, "should be logged");

    expect(bunyanEmitSpy).toHaveBeenCalledTimes(1);
    expect(bunyanEmitSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        category: "Timing.DynamoDb",
        msg: "should be logged",
      }),
      undefined
    );
  });

  test.each(buildLoggerOptions({
    name: "testing",
    config: {
      Timing: {
        minLevel: "warn",
        conditional: {
          alwaysLog: true,
          minLevel: "info"
        },
      },
    },
  }))("logs when conditional matches", (options) => {
    const logger = new CategoryLogger(options);

    logger.info({ category: "Timing", alwaysLog: true }, "should be logged");

    expect(bunyanEmitSpy).toHaveBeenCalledTimes(1);
    expect(bunyanEmitSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        category: "Timing",
        msg: "should be logged",
      }),
      undefined
    );
  });

  test.each(buildLoggerOptions({
    name: "testing",
    config: {
      Timing: {
        minLevel: "warn",
        conditional: {
          alwaysLog: true,
          minLevel: "info"
        },
      },
    },
  }))("does not log when conditional does not match", (options) => {
    const logger = new CategoryLogger(options);

    logger.info({ category: "Timing", alwaysLog: false }, "should not be logged");

    expect(bunyanEmitSpy).toHaveBeenCalledTimes(0);
  });

  test.each(buildLoggerOptions({
    name: "testing",
    config: {
      Timing: {
        minLevel: "warn",
        subConfig: {
          DynamoDb: {
            minLevel: "warn",
            conditional: {
              alwaysLog: true,
              minLevel: "info"
            },
          },
        },
      },
    },
  }))("logs conditional within sub-config", (options) => {
    const logger = new CategoryLogger(options);

    logger.info({ category: "Timing.DynamoDb", alwaysLog: true }, "should be logged");

    expect(bunyanEmitSpy).toHaveBeenCalledTimes(1);
    expect(bunyanEmitSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        category: "Timing.DynamoDb",
        msg: "should be logged",
      }),
      undefined
    );
  });

  test.each(buildLoggerOptions({
    name: "testing",
    config: {
      Timing: {
        minLevel: "warn",
        subConfig: {
          DynamoDb: {
            minLevel: "warn",
          },
        },
        conditional: {
          alwaysLog: true,
          minLevel: "info"
        },
      },
    },
  }))("logs using top-level conditional even when sub-config does not match", (options) => {
    const logger = new CategoryLogger(options);

    logger.info({ category: "Timing.DynamoDb", alwaysLog: true }, "should be logged");

    expect(bunyanEmitSpy).toHaveBeenCalledTimes(1);
    expect(bunyanEmitSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        category: "Timing.DynamoDb",
        msg: "should be logged",
      }),
      undefined
    );
  });

  test.each(loggerOptions)("category and log arguments constructor signature respects subconfigs", (options) => {
    const logger = new CategoryLogger(options);
    const infoLogArguments = jest.fn();
    logger.info("Timing.Neptune", infoLogArguments);

    const warnLogArguments = jest
      .fn()
      .mockReturnValue([{ specialProp: 123 }, "warning message"]);
    logger.warn("Timing.Neptune", warnLogArguments);

    logger.warn("Timing.Neptune", () => ["only the message argument"]);

    expect(infoLogArguments).not.toHaveBeenCalled();
    expect(warnLogArguments).toHaveBeenCalledTimes(1);
    expect(bunyanEmitSpy).toHaveBeenCalledTimes(2);
    expect(bunyanEmitSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        category: "Timing.Neptune",
        specialProp: 123,
        msg: "warning message",
      }),
      undefined
    );
    expect(bunyanEmitSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        category: "Timing.Neptune",
        msg: "only the message argument",
      }),
      undefined
    );
  });
});

test("changing value returned from config provider applies to children loggers", () => {
  const configProvider = {
    config: {
      Timing: "error"
    },
    getConfig() {
      return this.config;
    },
  };

  const logger = new CategoryLogger({
    name: "testing",
    configProvider,
  });
  const child = logger.child({ iAmAChild: true });

  child.info({ category: "Timing" }, "should not be logged");

  expect(bunyanEmitSpy).not.toHaveBeenCalled();

  configProvider.config = {
    Timing: "trace"
  }

  child.info({ category: "Timing" }, "should be logged");

  expect(bunyanEmitSpy).toHaveBeenCalledTimes(1);
});
