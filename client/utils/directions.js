module.exports = {
  computeTravelDistance(directions) {
    let total = 0,
      route = directions.routes[0];

    for (let i = 0; i < route.legs.length; i++) {
      total += route.legs[i].distance.value;
    }

    return total;
  },

  getRoutePoints(directions) {
    let route = directions.routes[0],
      flattenedPoints = [];

    for (let l = 0; l < route.legs.length; l++) {
      let leg = route.legs[l];

      for (let s = 0; s < leg.steps.length; s++) {
        let step = leg.steps[s];

        flattenedPoints = flattenedPoints.concat(step.path);
      }
    }

    return flattenedPoints;
  },

  pointToLocation(point) {
    return {
      lat: point.lat(),
      lng: point.lng()
    };
  }
};
