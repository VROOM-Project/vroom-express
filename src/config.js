var minimist = require("minimist");

// Config variables.
var cliArgs = minimist(process.argv.slice(2), {
  alias: {
    p: "port",
    r: "router"
  },
  boolean: ["geometry", "override"],
  default: {
    port: 3000, // expressjs port
    path: "", // VROOM path (if not in $PATH)
    maxjobs: "2", // max number of jobs
    maxvehicles: "2", // max number of vehicles
    geometry: false, // retrieve geometry (-g)
    router: "osrm", // routing backend (osrm, libosrm or ors)
    override: true, // allow cl option override (-g only so far)
    logdir: __dirname + "/..", // put logs in there
    limit: "1mb", // max request size
    timeout: 5 * 60 * 1000 // milli-seconds.
  }
});

// For each routing profile add a host and a port for use with osrm
// and ors.
var routingServers = {
  car: {
    host: "0.0.0.0",
    port: "5000"
  }
};

// Hard-code error codes 1, 2 and 3 as defined in vroom. Add 4 code
// for size checks.
var errorCodes = {
  internal: 1,
  input: 2,
  routing: 3,
  vehicles: 4,
  jobs: 5
};

module.exports = {
  errorCodes: errorCodes,
  cliArgs: cliArgs,
  routingServers: routingServers
};
