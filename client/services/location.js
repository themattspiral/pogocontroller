const qwest = require('qwest');

module.exports = {
  getLocation: (callback) => {
    qwest.get('/location').then((xhr, response) => {
      callback(undefined, response);
    }).catch((err) => {
      callback(err);
    });
  },

  updateLocation: (position, callback) => {
    let addr = '/location?lat=' + position.lat + '&lng=' + position.lng;

    qwest.put(addr).then((xhr, response) => {
      callback(undefined, response);
    }).catch((err) => {
      callback(err);
    });
  }
};
