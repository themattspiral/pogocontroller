import { throttle } from 'lodash';
import locationService from './services/location';
import walking from './utils/walking';
import directions from './utils/directions';
import './app.scss';

const UPDATE_LIMIT_MS = 375;
const CURRENT_WALK_SPEED = walking.SPEEDS.faster;
const STATES = {
  MANUAL: 'MANUAL',                         // no walking, all manual control
  DROPPING_PIN: 'DROPPING_PIN',             // dropping pin, no direction set yet
  SETTING_DIRECTIONS: 'SETTING_DIRECTIONS', // pin dropped, directions can still be changed
  WALKING: 'WALKING',                       // walking in progress, no direction changes, no manual control
  WALKING_PAUSED: 'WALKING_PAUSED'          // walking paused, no direction changes, no manual control
};

var gmap,

  currentLocation,
  currentLocationMarker,
  nextLocationMarker,

  directionsService,
  directionsDisplay,
  walkingRoutePoints,
  walkingPointIndex,
  walkingInterval,

  currentState = STATES.MANUAL,

  dropPinControl,
  cancelPinControl,
  startWalkingControl,
  pauseWalkingControl,
  continueWalkingControl,
  stopWalkingControl,

  markers;

const throttledPushLocationUpdate = throttle((location) => {
  locationService.updateLocation(location, (err) => {
    if (err) {
      console.log('Error updating location:');
      console.log(err);

      // reset
      currentLocationMarker.setPosition(currentLocation);
    }
  });
}, UPDATE_LIMIT_MS);

function setCurrentLocation(location) {
  currentLocation = {
    lat: location.lat,
    lng: location.lng
  };
}

function updateLocationTo(location) {
  currentLocationMarker.setPosition(location);

  // optimistically update in-memory location before confirming that server update was successful
  setCurrentLocation(location);

  throttledPushLocationUpdate(location);
}

function fetchDirections() {
  let request = {
    origin: currentLocationMarker.getPosition(),
    destination: nextLocationMarker.getPosition(),
    travelMode: google.maps.TravelMode.WALKING
  };

  directionsService.route(request, function(response, status) {
    if (status === 'OK') {
      nextLocationMarker.setVisible(false);
      directionsDisplay.setDirections(response);
      directionsDisplay.setMap(gmap);
      return response;
    } else {
      console.log('Directions request failed with status: ', status);
      console.log(response);

      return null;
    }
  });
}

function pinDrop() {
  currentState = STATES.DROPPING_PIN;
  updateMapControlsForState();

  nextLocationMarker.setPosition({lat: currentLocation.lat, lng: currentLocation.lng + 0.0002});
  nextLocationMarker.setAnimation(google.maps.Animation.BOUNCE);
  nextLocationMarker.setVisible(true);
}

function cancelPinAndDirections() {
  currentState = STATES.MANUAL;
  updateMapControlsForState();

  nextLocationMarker.setVisible(false);
  directionsDisplay.setMap(null);
}

function isCurrentLocationAtPoint(point) {
  let currentPoint = new google.maps.LatLng(currentLocation.lat, currentLocation.lng),
    dist = google.maps.geometry.spherical.computeDistanceBetween(currentPoint, point);

  return dist <= 0.8; // roughly 2 steps away, maybe a little more
}

function autoWalkStep() {
  let shouldMove = true;

  console.log('Checking point: ', walkingPointIndex);

  if (isCurrentLocationAtPoint(walkingRoutePoints[walkingPointIndex])) {
    console.log('Current Location close Enough to target point.');

    if (walkingPointIndex === walkingRoutePoints.length - 1) {
      console.log('End of walk. Cancelling Interval');
      shouldMove = false;
      pauseWalking();
      cancelPinAndDirections();
    } else {
      walkingPointIndex++;
      console.log('Now checking point: ', walkingPointIndex);
    }
  }

  if (shouldMove) {
    let targetLocation = directions.pointToLocation(walkingRoutePoints[walkingPointIndex]),
      changedLocation = walking.stepToward(currentLocation, CURRENT_WALK_SPEED, targetLocation);

    updateLocationTo(changedLocation);
  }
}

function pauseWalking() {
  clearInterval(walkingInterval);

  // allow changing directions and manually moving
  directionsDisplay.setOptions({draggable: true});
  currentLocationMarker.setDraggable(true);

  currentState = STATES.WALKING_PAUSED;
  updateMapControlsForState();
}

function continueWalking() {
  currentState = STATES.WALKING;
  updateMapControlsForState();

  // prevent changing directions or manually moving marker while walking
  directionsDisplay.setOptions({draggable: false});
  currentLocationMarker.setDraggable(false);

  // move marker
  walkingInterval = setInterval(autoWalkStep, UPDATE_LIMIT_MS);
}

function stopWalking() {
  pauseWalking();
  cancelPinAndDirections();
}

function togglePauseContinueWalking() {
  if (currentState === STATES.WALKING) {
    pauseWalking();
  } else if (currentState === STATES.WALKING_PAUSED) {
    continueWalking();
  }
}

function startWalking() {
  let currentDirs = directionsDisplay.getDirections();

  walkingRoutePoints = directions.getRoutePoints(currentDirs);
  walkingPointIndex = 0;

  console.log('Walking ' + walkingRoutePoints.length + ' points...');

  // markers = [];
  // for (let i = 0; i < walkingRoutePoints.length; i++) {
  //   markers.push(new google.maps.Marker({
  //     position: walkingRoutePoints[i],
  //     map: gmap,
  //     title: 'Route Marker ' + i,
  //     label: i + ' ' + i + ' ' + i + ' ' + i,
  //     icon: '//maps.google.com/mapfiles/ms/icons/blue-dot.png'
  //   }));
  // }

  continueWalking();
}

function initMapControls() {
  dropPinControl = document.getElementById('drop-pin-control-div');
  cancelPinControl = document.getElementById('cancel-pin-control-div');
  startWalkingControl = document.getElementById('start-walking-control-div');
  pauseWalkingControl = document.getElementById('pause-walking-control-div');
  continueWalkingControl = document.getElementById('continue-walking-control-div');
  stopWalkingControl = document.getElementById('stop-walking-control-div');

  dropPinControl.addEventListener('click', pinDrop);
  cancelPinControl.addEventListener('click', cancelPinAndDirections);
  startWalkingControl.addEventListener('click', startWalking);
  pauseWalkingControl.addEventListener('click', pauseWalking);
  continueWalkingControl.addEventListener('click', continueWalking);
  stopWalkingControl.addEventListener('click', stopWalking);
}

function updateMapControlsForState() {
  // get rid of walking controls and re-add them - this seems to be the best way to let gmaps position them
  gmap.controls[google.maps.ControlPosition.TOP_RIGHT].clear();

  switch (currentState) {
    case STATES.MANUAL:
      gmap.controls[google.maps.ControlPosition.TOP_RIGHT].push(dropPinControl);
      break;

    case STATES.DROPPING_PIN:
      gmap.controls[google.maps.ControlPosition.TOP_RIGHT].push(cancelPinControl);
      break;

    case STATES.SETTING_DIRECTIONS:
      gmap.controls[google.maps.ControlPosition.TOP_RIGHT].push(cancelPinControl);
      gmap.controls[google.maps.ControlPosition.TOP_RIGHT].push(startWalkingControl);
      break;

    case STATES.WALKING:
      gmap.controls[google.maps.ControlPosition.TOP_RIGHT].push(pauseWalkingControl);
      gmap.controls[google.maps.ControlPosition.TOP_RIGHT].push(stopWalkingControl);
      break;

    case STATES.WALKING_PAUSED:
      gmap.controls[google.maps.ControlPosition.TOP_RIGHT].push(continueWalkingControl);
      gmap.controls[google.maps.ControlPosition.TOP_RIGHT].push(stopWalkingControl);
      break;
  }
}

function initMap() {
  gmap = new google.maps.Map(document.getElementById('map'), {
    zoom: 18,
    center: currentLocation,
    streetViewControl: false
  });

  directionsService = new google.maps.DirectionsService();
  directionsDisplay = new google.maps.DirectionsRenderer({
    draggable: true,
    map: gmap,
    preserveViewport: true
  });

  directionsDisplay.addListener('directions_changed', function() {
    let currentDirs = directionsDisplay.getDirections(),
      travelDist = directions.computeTravelDistance(currentDirs),
      directDist = google.maps.geometry.spherical.computeDistanceBetween(currentDirs.request.origin, currentDirs.request.destination);

    console.log('Total travel distance (meters): ', travelDist);
    console.log('Origin to destination direct distance (meters): ', directDist);
    console.log('');
  });

  currentLocationMarker = new google.maps.Marker({
    position: currentLocation,
    draggable: true,
    map: gmap,
    title: 'Current Location'
  });

  nextLocationMarker = new google.maps.Marker({
    position: currentLocation,
    animation: google.maps.Animation.BOUNCE,
    draggable: true,
    map: gmap,
    title: 'Destination Location',
    visible: false,
    icon: '//maps.google.com/mapfiles/ms/icons/blue-dot.png'
  });

  google.maps.event.addListener(currentLocationMarker, 'dragend', () => {
    let position = currentLocationMarker.getPosition();

    updateLocationTo({
      lat: position.lat(),
      lng: position.lng()
    });
  });

  google.maps.event.addListener(nextLocationMarker, 'dragend', () => {
    currentState = STATES.SETTING_DIRECTIONS;
    updateMapControlsForState();

    fetchDirections();
  });
}

function initLocation(callback) {
  locationService.getLocation((err, response) => {
    if (err) {
      console.log('Error fetching location:');
      console.log(err);
    } else {
      setCurrentLocation(response);
      callback();
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

    // o or O - cancel drop pin and/or directions
    case 79:
    case 111:
      cancelPinAndDirections();
      break;

    // p or P - drop pin
    case 80:
    case 112:
      pinDrop();
      break;

    // j or J - stop walking
    case 74:
    case 106:
      stopWalking();
      break;

    // k or K - pause or continue walking
    case 75:
    case 107:
      togglePauseContinueWalking();
      break;

    // l or L - start walking
    case 76:
    case 108:
      startWalking();
      break;

    default:
      console.log(evt.which);
  }

  if (changedLocation) {
    updateLocationTo(changedLocation);
  }
};

/***** RUN *****/

initLocation(() => {
  initMap();
  initMapControls();
  updateMapControlsForState();
});
