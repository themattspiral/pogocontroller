'use strict';

const express = require('express');
const path = require('path');
const cookieParser = require('cookie-parser');
const bodyParser = require('body-parser');
const moment = require('moment');
const child_process = require('child_process');
const xmlbuilder = require('xmlbuilder');
const fs = require('fs');

const app = express();

const dateFormat = 'YYYY-MM-DD HH:mm:ss';
const defaultLocation = {lat: 41.865508, lng: -88.111535};
let location = Object.assign({}, defaultLocation);

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
    fs.writeFileSync('pokemonLocation.gpx', xml.end());
    console.log('  SAVED GPX file with lat: ' + position.lat + ' lng: ' + position.lng);
  } catch (ex) {
    console.log('  ERROR saving GPX file with lat: ' + position.lat + ' lng: ' + position.lng);
  }
}

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, '../public')));

app.get('/location', (req, res) => {
  res.json(location);
});

app.get('/location/reset', (req, res) => {
  console.log(moment().format(dateFormat) + ': RESETTING to DEFAULT location');
  location = Object.assign({}, defaultLocation);
  res.json(location);
});

app.get('/set-location', (req, res) => {
  const lat = Number(req.query.lat),
      lng = Number(req.query.lng);

  if (lat && !isNaN(lat) && lng && !isNaN(lng)) {
    location.lat = lat;
    location.lng = lng;
    console.log(moment().format(dateFormat) + ': SETTING NEW location lat: ' + lat + ' lng: ' + lng);

    writeLocationFileSync(location);
    clickXcodeDebugLocationSync(location);

    res.status(200).json(location);
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

const server = app.listen(8080, () => {
  console.log("Listening on port %s...", server.address().port);
});
