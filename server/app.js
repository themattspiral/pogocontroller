'use strict';

const express = require('express');
const path = require('path');
const cookieParser = require('cookie-parser');
const bodyParser = require('body-parser');
const moment = require('moment');
const child_process = require('child_process');
const xmlbuilder = require('xmlbuilder');
const fs = require('fs');
const xml2js = require('xml2js');

const app = express();

const LOCATION_FILE = 'pokemonLocation.gpx';
const LOCATION_FILE_ENCODING = 'utf8';
const DATE_FORMAT = 'YYYY-MM-DD HH:mm:ss';
const DEFAULT_LOCATION = {lat: 41.865508, lng: -88.111535};

let LOCATION = Object.assign({}, DEFAULT_LOCATION);

function clickXcodeDebugLocationSync(position) {
  try {
    child_process.spawnSync(
      'osascript',
      ['click.applescript'],
      {cwd: path.join(__dirname, '../')}
    );
    console.log('  CLICKED XCode to simulate lat: ' + position.lat + ' lng: ' + position.lng);
  } catch(ex) {
    console.log('  ERROR clicking XCode to simulate lat: ' + position.lat + ' lng: ' + position.lng);
  }
}

function writeLocationFileSync(position) {
  let xml = xmlbuilder.create({
    gpx: {
      '@creator': 'Xcode',
      '@version': 1.1,
      wpt: {
        '@lat': position.lat,
        '@lon': position.lng,
        name: {
          '#text': 'pokemonLocation'
        }
      }
    }
  });

  try {
    fs.writeFileSync(LOCATION_FILE, xml.end(), {encoding: LOCATION_FILE_ENCODING});
    console.log('  SAVED GPX file with lat: ' + position.lat + ' lng: ' + position.lng);
  } catch (ex) {
    console.log('  ERROR saving GPX file with lat: ' + position.lat + ' lng: ' + position.lng);
  }
}

function loadSavedLocationFromFileSync() {
  let parser = new xml2js.Parser({async: false});

  if (fs.existsSync(LOCATION_FILE)) {
    const locdata = fs.readFileSync(LOCATION_FILE, {encoding: LOCATION_FILE_ENCODING});

    parser.parseString(locdata, function (err, result) {
      if (!err && result && result.gpx && result.gpx.wpt && result.gpx.wpt.length && result.gpx.wpt[0]['$']) {

        const loc = result.gpx.wpt[0]['$'],
          lat = Number(loc.lat),
          lng = Number(loc.lon);

        if (lat && !isNaN(lat) && lng && !isNaN(lng)) {
          LOCATION = Object.assign({}, {
            lat: lat,
            lng: lng
          });

          console.log('Using stored location lat: ' + LOCATION.lat + ' lng: ' + LOCATION.lng);
        } else {
          console.log('Could not parse location from file [' + LOCATION_FILE + '] - using default location.');
        }
      } else {
        console.log('Could not parse location from file [' + LOCATION_FILE + '] - using default location.');
      }
    });
  } else {
    console.log('No location file [' + LOCATION_FILE + '] - using default location.')
  }
}

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, '../public')));

app.get('/location', (req, res) => {
  res.json(LOCATION);
});

app.post('/location/reset', (req, res) => {
  console.log(moment().format(DATE_FORMAT) + ': RESETTING to DEFAULT location');
  LOCATION = Object.assign({}, DEFAULT_LOCATION);
  res.json(LOCATION);
});

app.put('/set-location', (req, res) => {
  const lat = Number(req.query.lat),
      lng = Number(req.query.lng);

  if (lat && !isNaN(lat) && lng && !isNaN(lng)) {
    LOCATION = Object.assign({}, {
      lat: lat,
      lng: lng
    });
    console.log(moment().format(DATE_FORMAT) + ': SETTING NEW location lat: ' + lat + ' lng: ' + lng);

    writeLocationFileSync(LOCATION);
    clickXcodeDebugLocationSync(LOCATION);

    res.status(200).json(LOCATION);
  } else {
    let err = 'bad input, keeping current location';
    console.log('  ' + err);
    res.status(400).json({message: err});
  }
});

// catch 404 and forward to error handler
app.use((req, res, next) => {
  let err = new Error('Not Found');
  err.status = 404;
  next(err);
});

// error handler
app.use((err, req, res, next) => {
  let resp = [];
  resp.message = err.message;
  resp.error = req.app.get('env') === 'development' ? err : {};

  // render the error page
  res.status(err.status || 500);
  res.json(resp);
});

loadSavedLocationFromFileSync();

const server = app.listen(8080, () => {
  console.log("Listening on port %s...", server.address().port);
});
