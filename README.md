# bunyan-category

This project exports `CategoryLogger`. As you might expect, `CategoryLogger`
derives from Bunyan's `Logger`. It is completely compatible with that interface,
so feel free to swap it in without changing any of your code just yet.

`CategoryLogger` accepts a category config and outputs logs (or doesn't) in
accordance with its config. Here's a quick example:

```
const logger = new CategoryLogger({
  name: "testing",
  config: {
    Foo: "warn",
    Bar: {
      minLevel: "warn",
      subConfig: {
        Baz: "info",
      },
    },
  },
});

logger.trace({ category: "Foo" }, "won't be logged");
logger.info({ category: "Foo" }, "won't be logged");
logger.warn({ category: "Foo" }, "will be logged");

logger.trace({ category: "Bar" }, "won't be logged");
logger.info({ category: "Bar" }, "won't be logged");
logger.warn({ category: "Bar" }, "will be logged");

logger.trace({ category: "Bar.Baz" }, "won't be logged");
logger.info({ category: "Bar.Baz" }, "will be logged");
logger.warn({ category: "Bar.Baz" }, "will be logged");
```

If a subconfig cannot be found for a category, the closest parent's minimum
level will be used.

```
logger.info({ category: "Bar.Qux" }, "won't be logged");
```

Since `CategoryLogger` is compatible with Bunyan, children work as you'd expect:

```
const barLogger = logger.child({ category: 'Bar' });

bar.info("won't be logged");
bar.warn("will be logged");
```

Performance can become an issue with high volume logs. To mitigate this,
CategoryLogger adds another signature to Bunyan's log methods:

```
logger.info("Foo", () => [
  { logProp: 123, thereCouldBeALotMoreOfThese: true },
  "This function will not be invoked",
]);
```

The array returned from the constructor can be anything you would pass as
arguments to one of Bunyan's log methods.

```
logger.warn(
  "Foo",
  () => ["change da world; my final message"]
);

logger.warn(
  "Foo",
  () => ["fancy %s", formatting]
);

// etc. etc.
```

As the example implies, the log properties constructor function will not be
invoked unless the CategoryLogger is actually going to output the log. This can
save a lot of memory and time for logs that you expect to be disabled most of
the time.

As a rule of thumb for best performance, if you expect a log to be disabled most
of the time and only enabled for debugging, use the constructor signature. If a
log is always enabled, use the normal signature as it is slightly more
performant in that case.

But remember: no log is always the _most_ performant!

For log messages that that you always want to emit regardless of category use the `alwaysEmitLog:true` flag.

```
const barLogger = logger.child({ category: 'Bar' });

bar.info("won't be logged");
bar.info({ alwaysEmitLog: true }, "will be logged");
```

Note: The `alwaysEmitLog` will not work with the high performance log statements because the log function is not executed unless the category exists.

CategoryLogger supports a `configProvider` option which you can use to control
the config of all loggers created for your application from a central location.
The object passed as the config provider must provide a `getConfig` method.

```
const configProvider = {
  config: {
    Foo: "warn",
  },
  getConfig() {
    return this.config;
  },
};
const logger = new CategoryLogger({
  name: "testing",
  configProvider,
});
const child = logger.child({ category: "Foo" });

logger.info({ category: "Foo" }, "won't be logged");
child.info("won't be logged");
logger.warn({ category: "Foo" }, "will be logged");
child.warn("will be logged");

configProvider.config = {
  Foo: "info",
};

logger.info({ category: "Foo" }, "will be logged");
child.info("will be logged");
```

If both `config` and `configProvider` are provided, `config` overrides
`configProvider`.

This project provides a JSON schema for validating CategoryLogger configs which
you can use with services like AWS AppConfig to ensure that config deployments
are valid.

