import { throttle } from 'lodash';
import locationService from './services/location';
import walking from './utils/walking';
import directions from './utils/directions';

const UPDATE_LIMIT_MS = 375;
const CURRENT_WALK_SPEED = walking.SPEEDS.faster;

var gmap,

  currentLocation,
  currentLocationMarker,
  nextLocationMarker,

  directionsService,
  directionsDisplay,
  walkingRoutePoints,
  walkingPointIndex,
  walkingInterval,

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
      return response;
    } else {
      console.log('Directions request failed with status: ', status);
      console.log(response);

      return null;
    }
  });
}

function pinDrop() {
  nextLocationMarker.setPosition({lat: currentLocation.lat, lng: currentLocation.lng + 0.0002});
  nextLocationMarker.setAnimation(google.maps.Animation.BOUNCE);
  nextLocationMarker.setVisible(true);
}

function cancelPinAndDirections() {
  nextLocationMarker.setVisible(false);
  directionsDisplay.setVisible(false);
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
      stopWalking();
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

function stopWalking() {
  clearInterval(walkingInterval);
}

function continueWalking() {
  walkingInterval = setInterval(autoWalkStep, UPDATE_LIMIT_MS);
}

function startWalking() {
  let currentDirs = directionsDisplay.getDirections();

  walkingRoutePoints = directions.getRoutePoints(currentDirs);
  walkingPointIndex = 0;

  console.log('walking ' + walkingRoutePoints.length + ' points...');

  markers = [];
  for (let i = 0; i < walkingRoutePoints.length; i++) {
    markers.push(new google.maps.Marker({
      position: walkingRoutePoints[i],
      map: gmap,
      title: 'Route Marker ' + i,
      label: i + ' ' + i + ' ' + i + ' ' + i,
      icon: '//maps.google.com/mapfiles/ms/icons/blue-dot.png'
    }));
  }

  continueWalking();
}

function initMap(initialLocation) {
  gmap = new google.maps.Map(document.getElementById('map'), {
    zoom: 18,
    center: initialLocation,
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

    directionsDisplay.setVisible(true);
    console.log('Total travel distance (meters): ', travelDist);
    console.log('Origin to destination direct distance (meters): ', directDist);
    console.log('');
  });

  currentLocationMarker = new google.maps.Marker({
    position: initialLocation,
    draggable: true,
    map: gmap,
    title: 'Current Location'
  });

  nextLocationMarker = new google.maps.Marker({
    position: initialLocation,
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
    fetchDirections();
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
      cancelPinAndDirections();
      break;

    // k or K - pause walking
    case 75:
    case 107:
      stopWalking();
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

initLocation();
