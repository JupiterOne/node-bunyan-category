const Logger = require("bunyan");

function categoryConfigHasMatchingConditional(categoryConfig, record) {
  const { minLevel, ...configurationToMatch } = categoryConfig.conditional
  let allPropertiesMatch = true;

  for (const [key, value] of Object.entries(configurationToMatch)) {
    if(!record || record[key] !== value) {
      allPropertiesMatch = false;
      break;
    }
  }

  return allPropertiesMatch;
}

function findLogLevelNameForCategory(config, record, category, parentConfigMinLevel) {
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
        if(categoryConfig.conditional && categoryConfigHasMatchingConditional(categoryConfig, record)) {
          return categoryConfig.conditional.minLevel;
        }

        return findLogLevelNameForCategory(
          categoryConfig.subConfig,
          record,
          category.slice(indexOfSeparator + 1),
          categoryConfig.minLevel
        );
      } else if(categoryConfig.conditional) {
        return categoryConfigHasMatchingConditional(categoryConfig, record) ? categoryConfig.conditional.minLevel : categoryConfig.minLevel
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
      const config = this.configProvider.getConfig();
      const logLevelName = findLogLevelNameForCategory(config, undefined, category)
      const minLevel = Logger.levelFromName[logLevelName] || 0;

      if (Logger.levelFromName[logLevel] >= minLevel) {
        const _emitForReset = this._emit;

        // Attaches the category to whatever record Bunyan calculates from the
        // log arguments.
        this._emit = function (record, noemit) {
          // No need to call CategoryLogger's _emit here because we already know
          // that we want to log (we have already checked our category against
          // the config) and we will attach category to the record.
          return Logger.prototype._emit.call(
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

function staticConfigProvider(config) {
  return {
    getConfig() {
      return config;
    }
  };
}

const emptyConfigProvider = {
  getConfig() {
    return {};
  }
};

class CategoryLogger extends Logger {
  constructor(options, _childOptions) {
    if (_childOptions) {
      // In child constructors, the first argument is the parent logger.
      super(options, _childOptions);

      this.configProvider = options.configProvider;
    } else {
      // We cannot simply pass the CategoryLoggerOptions to bunyan because
      // bunyan adds any properties not specifically listed in its own
      // LoggerOptions to all log records.
      const config = options.config;
      const configProvider = options.configProvider;

      const loggerOptions = {
        ...options,
        config: undefined,
        configProvider: undefined,
      };

      super(loggerOptions);

      if (config !== undefined) {
        this.configProvider = staticConfigProvider(config);
      } else if (configProvider !== undefined) {
        this.configProvider = configProvider;
      } else {
        this.configProvider = emptyConfigProvider;
      }
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
      this.configProvider.getConfig(),
      record,
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
  return new CategoryLogger(options);
};

module.exports = CategoryLogger;
