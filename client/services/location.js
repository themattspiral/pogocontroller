var qwest = require('qwest');

module.exports = {
  getLocation: function(callback) {
    qwest.get('/location').then(function (xhr, response) {
      callback(undefined, response);
    }).catch(function (err) {
      callback(err);
    });
  },

  updateLocation: function(position, callback) {
    var addr = '/location?lat=' + position.lat + '&lng=' + position.lng;

    qwest.put(addr).then(function (xhr, response) {
      callback(undefined, response);
    }).catch(function (err) {
      callback(err);
    });
  }
};
