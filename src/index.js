const Logger = require("bunyan");

function findLogLevelNameForCategory(config, category, parentConfigMinLevel) {
  const indexOfSeparator = category.indexOf(".");

  let subCategory;
  if (indexOfSeparator > 0) {
    subCategory = category.slice(0, indexOfSeparator);
  } else {
    subCategory = category;
  }

  const categoryConfig = config[subCategory];

  if (categoryConfig) {
    if (typeof categoryConfig === "string") {
      return categoryConfig;
    } else if (categoryConfig.minLevel) {
      if (categoryConfig.subConfig) {
        return findLogLevelNameForCategory(
          categoryConfig.subConfig,
          category.slice(indexOfSeparator + 1),
          categoryConfig.minLevel
        );
      } else {
        return categoryConfig.minLevel;
      }
    }
  }

  return parentConfigMinLevel || "trace";
}

function logEmitter(logLevel) {
  return function () {
    // Introducing a separate function for this new properties constructor
    // signature (so that normal calls do not need to go through the else and
    // call branch) provides no distinguishable performance benefit.
    if (
      arguments.length === 2 &&
      typeof arguments[0] === "string" &&
      typeof arguments[1] === "function"
    ) {
      const category = arguments[0];
      const logArgumentsBuilder = arguments[1];
      const minLevel = Logger.levelFromName[this.config[category]] || 0;

      if (Logger.levelFromName[logLevel] >= minLevel) {
        const _emitForReset = this._emit;

        this._emit = function (record, noemit) {
          return CategoryLogger.prototype._emit.call(
            this,
            {
              ...record,
              category,
            },
            noemit
          );
        };

        this[logLevel].call(this, ...logArgumentsBuilder());

        this._emit = _emitForReset;
      }
    } else {
      return Logger.prototype[logLevel].call(this, ...arguments);
    }
  };
}

class CategoryLogger extends Logger {
  constructor(options, _childOptions) {
    if (_childOptions) {
      super(options, _childOptions);

      this.config = options.config;
    } else {
      // We cannot simply pass the CategoryLoggerOptions to bunyan because bunyan
      // adds any properties not specifically listed in its own LoggerOptions to
      // all log records.
      const categoryConfig = options.categoryConfig;
      const loggerOptions = {
        ...options,
        categoryConfig: undefined,
      };

      super(loggerOptions);

      this.config = categoryConfig;
    }
  }

  // _emit is the Logger prototype function that Bunyan uses to write the final
  // record to its output streams. We extend it in order to automatically
  // categorize and make it easier to add categorization to existing logs that
  // use the bunyan interface.
  _emit(record, noemit) {
    const category = record.category || Logger.nameFromLevel[record.level];
    const categorizedRecord = {
      ...record,
      category,
    };

    const levelNameForCategory = findLogLevelNameForCategory(
      this.config,
      category
    );
    const minLevel = Logger.levelFromName[levelNameForCategory];

    if (record.level >= minLevel) {
      return super._emit(categorizedRecord, noemit);
    }
  }

  child(options) {
    return new this.constructor(this, options);
  }
}

CategoryLogger.prototype.trace = logEmitter("trace");
CategoryLogger.prototype.debug = logEmitter("debug");
CategoryLogger.prototype.info = logEmitter("info");
CategoryLogger.prototype.warn = logEmitter("warn");
CategoryLogger.prototype.error = logEmitter("error");
CategoryLogger.prototype.fatal = logEmitter("fatal");
CategoryLogger.createLogger = function createLogger(options) {
  if (!options.categoryConfig) {
    options.categoryConfig = {};
  }

  return new CategoryLogger(options);
};

module.exports = CategoryLogger;
