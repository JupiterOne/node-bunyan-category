import Logger, * as bunyan from "bunyan";

declare class CategoryLogger extends Logger {
  constructor(options: CategoryLogger.CategoryLoggerOptions, _childOptions?: Record<string, string|number|Object>);

  static createLogger(
    options: CategoryLogger.CategoryLoggerOptions
  ): CategoryLogger;

  trace(): boolean;
  trace(error: Error, ...params: any[]): void;
  trace(obj: Object, ...params: any[]): void;
  trace(format: any, ...params: any[]): void;
  trace(category: string, logPropertiesConstructor: () => any[]): void;

  debug(): boolean;
  debug(error: Error, ...params: any[]): void;
  debug(obj: Object, ...params: any[]): void;
  debug(format: any, ...params: any[]): void;
  debug(category: string, logPropertiesConstructor: () => any[]): void;

  info(): boolean;
  info(error: Error, ...params: any[]): void;
  info(obj: Object, ...params: any[]): void;
  info(format: any, ...params: any[]): void;
  info(category: string, logPropertiesConstructor: () => any[]): void;

  warn(): boolean;
  warn(error: Error, ...params: any[]): void;
  warn(obj: Object, ...params: any[]): void;
  warn(format: any, ...params: any[]): void;
  warn(category: string, logPropertiesConstructor: () => any[]): void;

  error(): boolean;
  error(error: Error, ...params: any[]): void;
  error(obj: Object, ...params: any[]): void;
  error(format: any, ...params: any[]): void;
  error(category: string, logPropertiesConstructor: () => any[]): void;

  fatal(): boolean;
  fatal(error: Error, ...params: any[]): void;
  fatal(obj: Object, ...params: any[]): void;
  fatal(format: any, ...params: any[]): void;
  fatal(category: string, logPropertiesConstructor: () => any[]): void;
}

declare namespace CategoryLogger {
  export interface CategoryLoggerConfig {
    [category: string]: bunyan.LogLevelString | CategoryLoggerCategoryConfig;
  }

  export interface CategoryLoggerConditional {
    minLevel: bunyan.LogLevelString;
    [key: string]: string | number | boolean;
  }
  
  export interface CategoryLoggerCategoryConfig {
    minLevel: bunyan.LogLevelString;
    subConfig?: CategoryLoggerConfig;
    conditional?:CategoryLoggerConditional
  }

  export interface CategoryLoggerConfigProvider {
    getConfig(): CategoryLoggerConfig;
  }

  export interface CategoryLoggerOptions extends bunyan.LoggerOptions {
    config?: CategoryLoggerConfig;
    configProvider?: CategoryLoggerConfigProvider;
    category?: string;
  }

  export type LoggerOptions = bunyan.LoggerOptions;
  export type LogLevel = bunyan.LogLevel;
  export type LogLevelString = bunyan.LogLevelString;
  export type Serializers = bunyan.Serializers;
  export type RingBufferOptions = bunyan.RingBufferOptions;
  export type RotatingFileStreamOptions = bunyan.RotatingFileStreamOptions;
  export type StdSerializers = bunyan.StdSerializers;
  export type Stream = bunyan.Stream;
}

export = CategoryLogger;
