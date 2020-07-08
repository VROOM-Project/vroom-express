const bodyParser = require('body-parser');
const express = require('express');
const fs = require('fs');
const helmet = require('helmet');
const morgan = require('morgan');
const uuid = require('uuid');
const config = require('./config');

// App and loaded modules.
const app = express();

const HTTP_OK_CODE = 200;
const HTTP_ERROR_CODE = 400;
const HTTP_TOOLARGE_CODE = 413;
const HTTP_INTERNALERROR_CODE = 500;

// Enable cross-origin ressource sharing.
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header(
    'Access-Control-Allow-Headers',
    'Origin, X-Requested-With, Content-Type, Accept'
  );
  res.setHeader('Content-Type', 'application/json');
  next();
});

const args = config.cliArgs;
app.use(bodyParser.json({limit: args.limit}));
app.use(bodyParser.urlencoded({extended: true, limit: args.limit}));

const accessLogStream = fs.createWriteStream(args.logdir + '/access.log', {
  flags: 'a'
});

app.use(morgan('combined', {stream: accessLogStream}));

app.use(helmet());

app.use((err, req, res, next) => {
  if (
    err instanceof SyntaxError &&
    err.status === HTTP_ERROR_CODE &&
    'body' in err
  ) {
    const message =
      'Invalid JSON object in request, please add vehicles and jobs or shipments to the object body';
    console.log(now() + ': ' + JSON.stringify(message));
    res.status(HTTP_ERROR_CODE);
    res.send({
      code: config.vroomErrorCodes.input,
      error: message
    });
  }
});

// Simple date generator for console output.
const now = function() {
  const date = new Date();
  return date.toUTCString();
};

const fileExists = function(filePath) {
  try {
    return fs.statSync(filePath).isFile();
  } catch (err) {
    return false;
  }
};

// Callback for size and some input validity checks.
const sizeCheckCallback = function(maxLocationNumber, maxVehicleNumber) {
  return function(req, res, next) {
    const hasJobs = 'jobs' in req.body;
    const hasShipments = 'shipments' in req.body;

    const correctInput = (hasJobs || hasShipments) && 'vehicles' in req.body;
    if (!correctInput) {
      const message =
        'Invalid JSON object in request, please add vehicles and jobs or shipments to the object body';
      console.error(now() + ': ' + JSON.stringify(message));
      res.status(HTTP_ERROR_CODE);
      res.send({
        code: config.vroomErrorCodes.input,
        error: message
      });
      return;
    }

    let nbLocations = 0;
    if (hasJobs) {
      nbLocations += req.body.jobs.length;
    }
    if (hasShipments) {
      nbLocations += 2 * req.body.shipments.length;
    }

    if (nbLocations > maxLocationNumber) {
      const message = [
        'Too many locations (',
        nbLocations,
        ') in query, maximum is set to',
        maxLocationNumber
      ].join(' ');
      console.error(now() + ': ' + JSON.stringify(message));
      res.status(HTTP_TOOLARGE_CODE);
      res.send({
        code: config.vroomErrorCodes.tooLarge,
        error: message
      });
      return;
    }
    if (req.body.vehicles.length > maxVehicleNumber) {
      const vehicles = req.body.vehicles.length;
      const message = [
        'Too many vehicles (',
        vehicles,
        ') in query, maximum is set to',
        maxVehicleNumber
      ].join(' ');
      console.error(now() + ': ' + JSON.stringify(message));
      res.status(HTTP_TOOLARGE_CODE);
      res.send({
        code: config.vroomErrorCodes.tooLarge,
        error: message
      });
      return;
    }
    next();
  };
};

// Cli wrapper and associated callback.
const spawn = require('child_process').spawn;

const vroomCommand = args.path + 'vroom';
const options = [];
options.push('-r', args.router);
if (args.router !== 'libosrm') {
  const routingServers = config.routingServers;
  for (const profileName in routingServers[args.router]) {
    const profile = routingServers[args.router][profileName];
    if ('host' in profile && 'port' in profile) {
      options.push('-a', profileName + ':' + profile.host);
      options.push('-p', profileName + ':' + profile.port);
    } else {
      console.error(
        "Incomplete configuration: profile '" +
          profileName +
          "' requires 'host' and 'port'."
      );
    }
  }
}
if (args.geometry) {
  options.push('-g');
}

const execCallback = function(req, res) {
  const reqOptions = options.slice();
  if (
    !args.geometry &&
    args.override &&
    'options' in req.body &&
    'g' in req.body.options &&
    req.body.options.g
  ) {
    reqOptions.push('-g');
  }

  let nbThreads = args.threads;
  if (
    args.override &&
    'options' in req.body &&
    't' in req.body.options &&
    typeof req.body.options.t == 'number'
  ) {
    nbThreads = req.body.options.t;
  }
  reqOptions.push('-t ' + nbThreads);

  let explorationLevel = args.explore;
  if (
    args.override &&
    'options' in req.body &&
    'x' in req.body.options &&
    typeof req.body.options.x == 'number'
  ) {
    explorationLevel = req.body.options.x;
  }
  reqOptions.push('-x ' + explorationLevel);

  const timestamp = Math.floor(Date.now() / 1000); //eslint-disable-line
  const fileName = args.logdir + '/' + timestamp + '_' + uuid.v1() + '.json';
  try {
    fs.writeFileSync(fileName, JSON.stringify(req.body));
  } catch (err) {
    console.error(now() + ': ' + err);

    res.status(HTTP_INTERNALERROR_CODE);
    res.send({
      code: config.vroomErrorCodes.internal,
      error: 'Internal error'
    });
    return;
  }

  reqOptions.push('-i ' + fileName);

  const vroom = spawn(vroomCommand, reqOptions, {shell: true});

  // Handle errors.
  vroom.on('error', err => {
    const message = ['Unknown internal error', err].join(': ');
    console.error(now() + ': ' + JSON.stringify(message));
    res.status(HTTP_INTERNALERROR_CODE);
    res.send({
      code: config.vroomErrorCodes.internal,
      error: message
    });
  });

  vroom.stderr.on('data', data => {
    console.error(now() + ': ' + data.toString());
  });

  // Handle solution. The temporary solution variable is required as
  // we also want to adjust the status that is only retrieved with
  // 'exit', after data is written in stdout.
  let solution = '';

  vroom.stdout.on('data', data => {
    solution += data.toString();
  });

  vroom.on('close', (code, signal) => {
    switch (code) {
      case config.vroomErrorCodes.ok:
        res.status(HTTP_OK_CODE);
        break;
      case config.vroomErrorCodes.internal:
        // Internal error.
        res.status(HTTP_INTERNALERROR_CODE);
        break;
      case config.vroomErrorCodes.input:
        // Input error.
        res.status(HTTP_ERROR_CODE);
        break;
      case config.vroomErrorCodes.routing:
        // Routing error.
        res.status(HTTP_INTERNALERROR_CODE);
        break;
      default:
        // Required for e.g. vroom crash or missing command in $PATH.
        res.status(HTTP_INTERNALERROR_CODE);
        solution = {
          code: config.vroomErrorCodes.internal,
          error: 'Internal error'
        };
    }
    res.send(solution);

    if (fileExists(fileName)) {
      fs.unlinkSync(fileName);
    }
  });
};

app.post(args.baseurl, [
  sizeCheckCallback(args.maxlocations, args.maxvehicles),
  execCallback
]);

// set the health endpoint with some small problem
app.get(args.baseurl + 'health', (req, res) => {
  const vroom = spawn(
    vroomCommand,
    ['-i', './healthchecks/vroom_custom_matrix.json'],
    {shell: true}
  );

  let msg = 'healthy';
  let status = HTTP_OK_CODE;

  vroom.on('error', () => {
    // only called when vroom not in cliArgs.path or PATH
    msg = 'vroom is not in $PATH, check cliArgs.path in config.yml';
    status = HTTP_INTERNALERROR_CODE;
  });

  vroom.stderr.on('data', err => {
    // called when vroom throws an error and sends the error message back
    msg = err.toString();
    status = HTTP_INTERNALERROR_CODE;
  });

  vroom.on('close', code => {
    if (code !== config.vroomErrorCodes.ok) {
      console.error(`${now()}: ${msg}`);
    }
    res.status(status).send();
  });
});

const server = app.listen(args.port, () => {
  console.log('vroom-express listening on port ' + args.port + '!');
});

server.setTimeout(args.timeout);
