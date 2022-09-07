# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to
[Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [0.3.1] - 2022-09-07

### Fixed

- `createLogger` function setting config to empty object when no `config` option
  was provided. This caused conflicts with `configProvider`.

## [0.3.0] - 2022-08-30

### Added

- This CHANGELOG.
- The `configProvider` option (see README for documentation).
- Initial documentation for the config JSON schema.

### Changed

- Renamed the `categoryConfig` option to `config`.

### Fixed

- Log arguments constructor call signature did not respect nested configs.

[Unreleased]: https://github.com/JupiterOne/node-bunyan-category/compare/v0.3.0...HEAD

[0.3.1]: https://github.com/JupiterOne/node-bunyan-category/compare/v0.3.0...v0.3.1
[0.3.0]: https://github.com/JupiterOne/node-bunyan-category/compare/v0.2.0...v0.3.0
