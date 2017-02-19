import Chance from 'chance';
const chance = new Chance();

const SPEEDS = {
  slow() {return chance.floating({fixed:12, min: 0.0000009, max: 0.0000013});},
  medium() {return chance.floating({fixed:12, min: 0.000001, max: 0.000002});},
  fast() {return chance.floating({fixed:12, min: 0.000002, max: 0.000003});},
  faster() {return chance.floating({fixed:12, min: 0.000004, max: 0.000005});}
};

function getRandomness(speed) {
  return {
    coordDelta: speed(),
    jitterDelta: chance.floating({fixed:12, min: 0.000000001, max: 0.000000003}),
    jitterDirection: chance.bool()
  };
}

module.exports = {
  SPEEDS,

  stepNorth(currentLocation, speed) {
    let r = getRandomness(speed);

    return {
      lat: currentLocation.lat + r.coordDelta,
      lng: r.jitterDirection ? currentLocation.lng + r.jitterDelta : currentLocation.lng - r.jitterDelta
    };
  },

  stepWest(currentLocation, speed) {
    let r = getRandomness(speed);

    return {
      lat: r.jitterDirection ? currentLocation.lat + r.jitterDelta : currentLocation.lat - r.jitterDelta,
      lng: currentLocation.lng - r.coordDelta
    }
  },

  stepSouth(currentLocation, speed) {
    let r = getRandomness(speed);

    return {
      lat: currentLocation.lat - r.coordDelta,
      lng: r.jitterDirection ? currentLocation.lng + r.jitterDelta : currentLocation.lng - r.jitterDelta
    };
  },

  stepEast(currentLocation, speed) {
    let r = getRandomness(speed);

    return {
      lat: r.jitterDirection ? currentLocation.lat + r.jitterDelta : currentLocation.lat - r.jitterDelta,
      lng: currentLocation.lng + r.coordDelta
    };
  },

  stepNorthwest(currentLocation, speed) {
    let r = getRandomness(speed);

    return {
      lat: currentLocation.lat + r.coordDelta,
      lng: currentLocation.lng - r.coordDelta
    };
  },

  stepNortheast(currentLocation, speed) {
    let r = getRandomness(speed);

    return {
      lat: currentLocation.lat + r.coordDelta,
      lng: currentLocation.lng + r.coordDelta
    };
  },

  stepSouthwest(currentLocation, speed) {
    let r = getRandomness(speed);

    return {
      lat: currentLocation.lat - r.coordDelta,
      lng: currentLocation.lng - r.coordDelta
    };
  },

  stepSoutheast(currentLocation, speed) {
    let r = getRandomness(speed);

    return {
      lat: currentLocation.lat - r.coordDelta,
      lng: currentLocation.lng + r.coordDelta
    };
  },

  stepToward(currentLocation, speed, targetLocation) {
    let stepFunction,
      latDiff = currentLocation.lat - targetLocation.lat,
      lngDiff = currentLocation.lng - targetLocation.lng,
      latDiffLarger = Math.abs(latDiff) > Math.abs(lngDiff),
      isCurrentlyNorth,
      isCurrentlyEast;

    isCurrentlyNorth = latDiff > 0;
    isCurrentlyEast = lngDiff > 0;

    // move north or south
    if (latDiffLarger) {
      if (isCurrentlyNorth) {
        stepFunction = this.stepSouth;
        console.log('stepping south');
      } else {
        stepFunction = this.stepNorth;
        console.log('stepping north');
      }
    } else {
      if (isCurrentlyEast) {
        stepFunction = this.stepWest;
        console.log('stepping west');
      } else {
        stepFunction = this.stepEast;
        console.log('stepping east');
      }
    }

    return stepFunction(currentLocation, speed);
  }
};
