'use strict';

const express = require('express');
const path = require('path');
const cookieParser = require('cookie-parser');
const bodyParser = require('body-parser');

const app = express();
const defaultLocation = {
  lat: 41.865508,
  lng: -88.111535
};
let location = Object.assign({}, defaultLocation);

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, '../public')));

app.get('/location', (req, res) => {
  res.json(location);
});

app.get('/location/reset', (req, res) => {
  console.log(new Date() + ": RESETTING to DEFAULT location");
  location = Object.assign({}, defaultLocation);
  res.json(location);
});

app.get('/set-location', (req, res) => {
  console.log(new Date() + ": SETTING NEW location");
  const lat = Number(req.query.lat),
      lng = Number(req.query.lng);

  if (lat && !isNaN(lat) && lng && !isNaN(lng)) {
    location.lat = lat;
    location.lng = lng;
    console.log('  lat: ' + lat);
    console.log('  lng: ' + lng);
    res.status(200).json(location);
  } else {
    console.log('  bad input, keeping current location');
    res.status(400).json({message: 'bad input, keeping current location'});
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
