var locationService = require('./services/location'),
  qwest = require('qwest'),
  _ = require('lodash'),
  Chance = require('chance'),
  chance = new Chance(),

  walkSpeed = {
    slow: function() {return chance.floating({fixed:12, min: 0.0000009, max: 0.0000013});},
    medium: function() {return chance.floating({fixed:12, min: 0.000001, max: 0.000002});},
    fast: function() {return chance.floating({fixed:12, min: 0.000002, max: 0.000003});},
    faster: function() {return chance.floating({fixed:12, min: 0.000004, max: 0.000005});}
  },

  currentLocation,
  locationMarker,
  map;

function setCurrentLocation(position) {
  currentLocation = {
    lat: position.lat,
    lng: position.lng
  };
}

var throttledUpdateLocation = _.throttle(function(position) {
  locationService.updateLocation(position, function(err, response) {
    if (err) {
      console.log('Error updating location:');
      console.log(err);

      // reset
      locationMarker.setPosition(currentLocation);
    } else {
      console.log('updated server location');
      // setCurrentLocation(response);
    }
  });
}, 375);

function updateLocation(position) {
  console.log('about to update location...');
  locationMarker.setPosition(position);
  setCurrentLocation(position); // optimistic

  throttledUpdateLocation(position);
}

function initMap(initialLocation) {
  map = new google.maps.Map(document.getElementById('map'), {
    zoom: 18,
    center: initialLocation
  });

  locationMarker = new google.maps.Marker({
    position: initialLocation,
    draggable: true,
    map: map,
    title: 'Current Location'
  });

  google.maps.event.addListener(locationMarker, 'dragend', function () {
    var position = locationMarker.getPosition();

    updateLocation({
      lat: position.lat(),
      lng: position.lng()
    });
  });
}

function initLocation() {
  qwest.setDefaultOptions({
    dataType: 'json',
    responseType: 'json'
  });

  locationService.getLocation(function (err, response) {
    if (err) {
      console.log('Error fetching location:');
      console.log(err);
    } else {
      setCurrentLocation(response);
      initMap(currentLocation);
    }
  });
}

document.onkeypress = function (evt) {
  var coordDelta = walkSpeed.faster();
  var jitter = chance.floating({fixed:12, min: 0.000000001, max: 0.000000003});
  var b = chance.bool();

  switch (evt.which) {
    // w or W - North
    case 87:
    case 119:
      updateLocation({
        lat: currentLocation.lat + coordDelta,
        lng: b ? currentLocation.lng + jitter : currentLocation.lng - jitter
      });
      break;
    // a or A - West
    case 65:
    case 97:
      updateLocation({
        lat: b ? currentLocation.lat + jitter : currentLocation.lat - jitter,
        lng: currentLocation.lng - coordDelta
      });
      break;
    // s or S - South
    case 83:
    case 115:
      updateLocation({
        lat: currentLocation.lat - coordDelta,
        lng: b ? currentLocation.lng + jitter : currentLocation.lng - jitter
      });
      break;
    // d or D - East
    case 68:
    case 100:
      updateLocation({
        lat: b ? currentLocation.lat + jitter : currentLocation.lat - jitter,
        lng: currentLocation.lng + coordDelta
      });
      break;
    // q or Q - Northwest
    case 81:
    case 113:
      updateLocation({
        lat: currentLocation.lat + coordDelta,
        lng: currentLocation.lng - coordDelta
      });
      break;
    // e or E - Northeast
    case 69:
    case 101:
      updateLocation({
        lat: currentLocation.lat + coordDelta,
        lng: currentLocation.lng + coordDelta
      });
      break;
    // z or Z - Southwest
    case 90:
    case 122:
      updateLocation({
        lat: currentLocation.lat - coordDelta,
        lng: currentLocation.lng - coordDelta
      });
      break;
    // x or X - Southeast
    case 88:
    case 120:
      updateLocation({
        lat: currentLocation.lat - coordDelta,
        lng: currentLocation.lng + coordDelta
      });
      break;
  }
};

initLocation();
