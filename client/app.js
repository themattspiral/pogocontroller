import {throttle} from 'lodash';

import locationService from './services/location';
import walking from './utils/walking';

const CURRENT_WALK_SPEED = walking.WALK_SPEEDS.faster;
const UPDATE_THROTTLE_LIMIT_MS = 375;

var currentLocation,
  locationMarker,
  map;

const throttledPushLocationUpdate = throttle((position) => {
  locationService.updateLocation(position, (err) => {
    if (err) {
      console.log('Error updating location:');
      console.log(err);

      // reset
      locationMarker.setPosition(currentLocation);
    }
  });
}, UPDATE_THROTTLE_LIMIT_MS);

function setCurrentLocation(position) {
  currentLocation = {
    lat: position.lat,
    lng: position.lng
  };
}

function updateLocationTo(location) {
  locationMarker.setPosition(location);

  // optimistically update in-memory location before confirming that server update was successful
  setCurrentLocation(location);

  throttledPushLocationUpdate(location);
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

  google.maps.event.addListener(locationMarker, 'dragend', () => {
    let position = locationMarker.getPosition();

    updateLocationTo({
      lat: position.lat(),
      lng: position.lng()
    });
  });
}

function initLocation() {
  locationService.getLocation((err, response) => {
    if (err) {
      console.log('Error fetching location:');
      console.log(err);
    } else {
      setCurrentLocation(response);
      initMap(currentLocation);
    }
  });
}

document.onkeypress = (evt) => {
  let changedLocation;

  switch (evt.which) {
    // w or W
    case 87:
    case 119:
      changedLocation = walking.stepNorth(currentLocation, CURRENT_WALK_SPEED);
      break;
    // a or A
    case 65:
    case 97:
      changedLocation = walking.stepWest(currentLocation, CURRENT_WALK_SPEED);
      break;
    // s or S
    case 83:
    case 115:
      changedLocation = walking.stepSouth(currentLocation, CURRENT_WALK_SPEED);
      break;
    // d or D
    case 68:
    case 100:
      changedLocation = walking.stepEast(currentLocation, CURRENT_WALK_SPEED);
      break;
    // q or Q
    case 81:
    case 113:
      changedLocation = walking.stepNorthwest(currentLocation, CURRENT_WALK_SPEED);
      break;
    // e or E
    case 69:
    case 101:
      changedLocation = walking.stepNortheast(currentLocation, CURRENT_WALK_SPEED);
      break;
    // z or Z
    case 90:
    case 122:
      changedLocation = walking.stepSouthwest(currentLocation, CURRENT_WALK_SPEED);
      break;
    // x or X
    case 88:
    case 120:
      changedLocation = walking.stepSoutheast(currentLocation, CURRENT_WALK_SPEED);
      break;
  }

  if (changedLocation) {
    updateLocationTo(changedLocation);
  }
};

initLocation();
