const Logger = require("bunyan");
const CategoryLogger = require("../src");

const bunyanEmitSpy = jest
  .spyOn(Logger.prototype, "_emit")
  .mockReturnValue("mocked");

test("logs under the min level of their category are not emitted", () => {
  const logger = CategoryLogger.createLogger({
    categoryConfig: {
      mySpecialCategory: "warn",
    },
    name: "testing",
  });

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

test("logs without an explicit category are logged with their level category", () => {
  const logger = new CategoryLogger({
    categoryConfig: {},
    name: "testing",
  });

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

test("category loggers can be created with a default category", () => {
  const logger = new CategoryLogger({
    categoryConfig: {
      mySpecialCategory: "error",
    },
    category: "mySpecialCategory",
    name: "testing",
  });

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

test("log level functions accept category and log arguments constructor", () => {
  const logger = new CategoryLogger({
    categoryConfig: {
      mySpecialCategory: "warn",
    },
    name: "testing",
  });

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

test("log arguments constructor works with child loggers", () => {
  const logger = new CategoryLogger({
    name: "testing",
    categoryConfig: {},
  });

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
  const logger = new CategoryLogger({
    name: "testing",
    categoryConfig: {
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

  test("matches most specific category in config", () => {
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

  test("matches parent config if child cannot be found", () => {
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

  test("matches parent config if child is invalid", () => {
    const logger = new CategoryLogger({
      name: "testing",
      categoryConfig: {
        Timing: {
          minLevel: "warn",
          subConfig: {
            Neptune: {
              i: "pull up",
            },
          },
        },
      },
    });

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

  test("matches config object without subconfig", () => {
    const logger = new CategoryLogger({
      name: "testing",
      categoryConfig: {
        Timing: {
          minLevel: "warn",
          subConfig: {
            DynamoDb: {
              minLevel: "info",
            },
          },
        },
      },
    });

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
});
