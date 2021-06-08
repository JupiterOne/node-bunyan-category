const CategoryLogger = require("../src");
const Logger = require("bunyan");

function createBigObject() {
  const logProperties = {};

  Array(1e5)
    .fill(0)
    .forEach((_, i) => {
      logProperties[i] = Math.random();
    });

  return logProperties;
}

function getMemoryKbReport() {
  return {
    allocatedKb: process.memoryUsage().heapTotal / 1024,
    usedKb: process.memoryUsage().heapUsed / 1024,
  };
}

function logMemoryKb(descriptor) {
  console.log(`${descriptor}: ${JSON.stringify(getMemoryKbReport())}`);
}

function doTimes(times, block) {
  for (let i = 0; i < times; ++i) {
    block();
  }
}

function withTimer(block) {
  const start = Date.now();
  block();
  return Date.now() - start;
}

function step(descriptor, block) {
  const milliseconds = withTimer(block);
  console.log(
    `${descriptor}: ${JSON.stringify({
      milliseconds,
      ...getMemoryKbReport(),
    })}`
  );
}

function bigLogPropertiesObjectTest() {
  console.log("Big Log Properties Object Test\n");

  const logger = CategoryLogger.createLogger({
    name: "big-log-properties-object",
    categoryConfig: {
      categoryToSkip: "warn",
    },
  });

  step("Skipped factory log", () =>
    logger.info("categoryToSkip", () => {
      return [
        createBigObject(),
        "the big object and this string will not be constructed" +
          "since this function will never be invoked",
      ];
    })
  );

  step("Skipped non-factory log", () =>
    logger.info(
      { category: "categoryToSkip", ...createBigObject() },
      "this log statement will go through the work of constructing the big object" +
        "and this string, despite ultimately logging neither of them"
    )
  );

  step("Second skipped factory log", () =>
    logger.info("categoryToSkip", () => {
      return [
        createBigObject(),
        "another one, just to further illustrate the point...",
      ];
    })
  );

  console.log("");
}

function negativeManyLogsTest(logTimes) {
  console.log("Negative Many Logs Test\n");

  const logger = CategoryLogger.createLogger({
    name: "negative-many-logs",
    categoryConfig: {
      categoryToSkip: "warn",
    },
  });

  const nativeLogger = Logger.createLogger({
    name: "negative-many-logs-native",
    streams: [
      {
        path: "/dev/null",
      },
    ],
  });

  step(`CategoryLogger: ${logTimes} factory logs`, () =>
    doTimes(logTimes, () => {
      logger.info("categoryToSkip", () => [
        {
          logPropOne: 111,
          logPropTwo: "a little string",
          logPropThree: true,
        },
        "xx",
      ]);
    })
  );

  step(`CategoryLogger: ${logTimes} non-factory logs`, () =>
    doTimes(logTimes, () => {
      logger.info(
        {
          category: "categoryToSkip",
          logPropOne: 123,
          logPropTwo: "a little string",
          logPropThree: true,
        },
        "the journey of a thousand miles begins with a single step"
      );
    })
  );

  step(`NativeLogger: ${logTimes} logs`, () =>
    doTimes(logTimes, () => {
      nativeLogger.info(
        {
          category: "categoryToSkip",
          logPropOne: 123,
          logPropTwo: "a little string",
          logPropThree: true,
        },
        "the journey of a thousand miles begins with a single step"
      );
    })
  );

  console.log("");
}

function positiveManyLogsTest(logTimes) {
  console.log("Positive Many Logs Test\n");

  const logger = CategoryLogger.createLogger({
    name: "positive-many-logs",
    categoryConfig: {
      categoryToSkip: "warn",
    },
    streams: [
      {
        path: "/dev/null",
      },
    ],
  });

  const nativeLogger = Logger.createLogger({
    name: "positive-many-logs-native",
    streams: [
      {
        path: "/dev/null",
      },
    ],
  });

  step(`CategoryLogger: ${logTimes} factory logs`, () =>
    doTimes(logTimes, () => {
      logger.info("noSkip", () => [
        {
          logPropOne: 111,
          logPropTwo: "a little string",
          logPropThree: true,
        },
        "xx",
      ]);
    })
  );

  step(`CategoryLogger: ${logTimes} non-factory logs`, () =>
    doTimes(logTimes, () => {
      logger.info(
        {
          category: "noSkip",
          logPropOne: 111,
          logPropTwo: "a little string",
          logPropThree: true,
        },
        "xx"
      );
    })
  );

  step(`NativeLogger: ${logTimes} logs`, () =>
    doTimes(logTimes, () => {
      nativeLogger.info(
        {
          category: "noSkip",
          logPropOne: 111,
          logPropTwo: "a little string",
          logPropThree: true,
        },
        "xx"
      );
    })
  );

  console.log("");
}

logMemoryKb("Baseline");

console.log("");

bigLogPropertiesObjectTest();

negativeManyLogsTest(1e6);

// To run a positiveManyLogsTest with a high number of logs, you may need to give the Node
// process a bigger heap, like so: NODE_OPTIONS=--max-old-space-size=4096 npm run benchmark
positiveManyLogsTest(1e6);
