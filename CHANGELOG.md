# Changelog

## [Unreleased]

### Changed

- Add env var for access.log (#41)

## [V0.5.0] - 2020-03-09

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
