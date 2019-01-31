'use strict';

var express = require('express');
var fs = require('fs');
var morgan = require('morgan');
var bodyParser = require('body-parser');
var helmet = require('helmet');
var minimist = require('minimist');

// Config variables.
var args = minimist(process.argv.slice(2), {
  alias: {
    p: 'port',
    r: 'router',
  },
  boolean: [
    'geometry',
    'override'
  ],
  default: {
    port: 3000,                 // expressjs port
    path: '',                   // VROOM path (if not in $PATH)
    maxjobs: '1000',            // max number of jobs
    geometry: false,            // retrieve geometry (-g)
    router: "osrm",             // routing backend
    override: true,             // allow cl option override (-g only so far)
    logdir: __dirname + '/..',  // put logs in there
    limit: '1mb',               // max request size
    timeout: 5 * 60 * 1000      // milli-seconds.
  }
});

// For each routing profile (e.g., car) add a host and a port.
var routingServers = {
  'car': {
    'host': '0.0.0.0',
    'port': '5000'
  }
}

// App and loaded modules.
var app = express();

// Enable cross-origin ressource sharing.
app.use(function(req, res, next) {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Headers",
             "Origin, X-Requested-With, Content-Type, Accept");
  next();
});

app.use(bodyParser.json({limit: args['limit']}));
app.use(bodyParser.urlencoded({limit: args['limit'], extended: true}));

var accessLogStream = fs.createWriteStream(args['logdir'] + '/access.log',
                                           {flags: 'a'});

app.use(morgan('combined', {stream: accessLogStream}));

app.use(helmet());

app.use(function(err, req, res, next) {
  res.setHeader('Content-Type', 'application/json');
  if (err instanceof SyntaxError && err.status === 400 && 'body' in err) {
    console.log(now() + ' - ' + 'Invalid JSON');
    res.send({code: 1, error: 'Invalid json.'});
  }
});

// Simple date generator for console output.
var now = function() {
  var date = new Date();
  return date.toUTCString();
}

// Callback for size and some input validity checks.
var sizeCheckCallback = function(maxJobNumber) {
  return function (req, res, next) {
    var correctInput = ('jobs' in req.body)
        && ('vehicles' in req.body)
        && (req.body['vehicles'].length >= 1);

    if (!correctInput) {
      res.send({code: 1, error: 'Invalid query.'});
      return;
    }

    if (req.body['jobs'].length > maxJobNumber) {
      console.log(now()
                  + ' - Too many jobs in query ('
                  + req.body['jobs'].length + ')');
      res.send({code: 1, error: 'Too many jobs.'});
      return;
    }
    next();
  }
}

// Cli wrapper and associated callback.
var spawn = require('child_process').spawn;

var vroomCommand = args['path'] + 'vroom';
var options = [];
options.push('-r', args['router']);
if (args['router'] != 'libosrm') {
  for (var profileName in routingServers) {
    var profile = routingServers[profileName];
    if ('host' in profile && 'port' in profile) {
      options.push('-a', profileName + ":" + profile['host']);
      options.push('-p', profileName + ":" + profile['port']);
    } else {
      console.log("Incomplete configuration: profile '" +
        profileName + "' requires 'host' and 'port'.");
      return;
    }
  }
}
if (args['geometry']) {
  options.push('-g');
}

var execCallback = function (req, res) {
  var reqOptions = options.slice();
  if (!args['geometry'] && args['override']
     && 'options' in req.body && 'g' in req.body['options']
     && req.body['options']['g']) {
    reqOptions.push('-g');
  }

  reqOptions.push(JSON.stringify(req.body));
  var vroom = spawn(vroomCommand, reqOptions);

  vroom.on('error', function(err) {
    console.log(now() + ' - ' + err);
    res.send({code: 1, error: 'Unfound command: ' + vroomCommand});
  });

  vroom.stdout.pipe(res);

  vroom.stderr.on('data', function (data) {
    console.log(now() + ' - ' + data.toString());
  });
}

app.post('/', [sizeCheckCallback(args['maxjobs']), execCallback]);

var server = app.listen(args['port'], function () {
  console.log('vroom-express listening on port ' + args['port'] + '!');
});

server.setTimeout(args['timeout']);
