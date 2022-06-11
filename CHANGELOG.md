# Changelog

## Unreleased

## [v0.11.0] - 2022-06-11

### Added

- Expose option -l to request (#91)

### Changed

- Use named functions (#92)

## [v0.10.0] - 2021-11-19

### Changed

- Update dependencies (#87)

## [v0.9.0] - 2021-05-06

### Added

- Valhalla support (#77)
- Possibility to launch VROOM in plan mode. (#70)

## [v0.8.0] - 2021-03-04

### Added

- Rotate log files (#59)

### Changed

- Update dependencies (#63)

### Removed

- Drop `body-parser` dependency (#62)

## [v0.7.0] - 2020-07-08

### Added

- Configurable API root url (#56)

### Changed

- Update dependencies (#52)

## [v0.6.0] - 2020-05-02

### Added

- Endpoint for health check with self-contained small instance (#30)
- Allow setting number of threads and exploration level at query time (#42)

### Changed

- Add env var for access.log (#41)

## [v0.5.0] - 2020-03-09

### Added

- Compatibility with `vroom` v1.5 (#37)
- Configuration file (#25, #38)
- Code formatting setup (#26)

### Fixed

- Improve error handling for file writing (#31)
- Wrong http status code in case of crash or missing executable (#27)

## [v0.4.2] - 2019-03-14

### Fixed

- Content-type not always properly set to `application/json` (#19)
- Server crash with concurrent requests (#20)
- Empty response with 200 status (#22)

## [v0.4.1] - 2019-03-09

### Fixed

- Truncated response (#18)

## [v0.4.0] - 2019-03-07

### Added

- Compatibility with `vroom` v1.4
- Command-line option for router choice (#11)
- Description for multiple routing profiles (#11)
- Add option to limit number of vehicles in input (#14)
- Adjust http response status based on vroom exit code (#13)

### Fixed

- Crash with big POST load (#16)

## [v0.3.0]

### Added

- Compatibility with `vroom` v1.3
- Expose configuration as parameters to command line (#8)

### Changed

- Raise default size and timeout limits and max jobs value (#5, #6)
- Code cleanup
