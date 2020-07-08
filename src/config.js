const minimist = require('minimist');
const yaml = require('js-yaml');
const fs = require('fs');

let config_yml;
try {
  config_yml = yaml.safeLoad(fs.readFileSync('./config.yml'));
} catch (err) {
  console.log(
    'Please provide a valid config.yml in the root.\nSee https://github.com/VROOM-Project/vroom-express#setup\n'
  );
  process.exitCode = 1;
  process.exit();
}

// Prefer env variable for router & access.log
const router = process.env.VROOM_ROUTER || config_yml.cliArgs.router;
const logdir = process.env.VROOM_LOG || __dirname + config_yml.cliArgs.logdir;

let baseurl = config_yml.cliArgs.baseurl;
if (baseurl.substr(-1) != '/') {
  baseurl += '/';
}

// Config variables.
const cliArgs = minimist(process.argv.slice(2), {
  alias: {
    p: 'port', // eslint-disable-line
    r: 'router', // eslint-disable-line
  },
  boolean: ['geometry', 'override'],
  default: {
    baseurl: baseurl, // base root url for api.
    explore: config_yml.cliArgs.explore, // exploration level to use (0..5) (-x)
    geometry: config_yml.cliArgs.geometry, // retrieve geometry (-g)
    limit: config_yml.cliArgs.limit, // max request size
    logdir: logdir, // put logs in there
    maxlocations: config_yml.cliArgs.maxlocations, // max number of jobs/shipments locations
    maxvehicles: config_yml.cliArgs.maxvehicles, // max number of vehicles
    override: config_yml.cliArgs.override, // allow cl option override (-g only so far)
    path: config_yml.cliArgs.path, // VROOM path (if not in $PATH)
    port: config_yml.cliArgs.port, // expressjs port
    router: router, // routing backend (osrm, libosrm or ors)
    threads: config_yml.cliArgs.threads, // number of threads to use (-t)
    timeout: config_yml.cliArgs.timeout // milli-seconds.
  }
});

// Error codes
const VROOM_OK_CODE = 0;
const VROOM_INTERNALERROR_CODE = 1;
const VROOM_INPUTERROR_CODE = 2;
const VROOM_ROUTINGERROR_CODE = 3;
const VROOM_TOOLARGE_CODE = 4;

// Hard-code error codes 1, 2 and 3 as defined in vroom. Add 4 code
// for size checks.
const vroomErrorCodes = {
  input: VROOM_INPUTERROR_CODE,
  internal: VROOM_INTERNALERROR_CODE,
  ok: VROOM_OK_CODE,
  routing: VROOM_ROUTINGERROR_CODE,
  tooLarge: VROOM_TOOLARGE_CODE
};

module.exports = {
  cliArgs: cliArgs,
  routingServers: config_yml.routingServers,
  vroomErrorCodes: vroomErrorCodes
};
