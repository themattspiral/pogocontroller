import qwest from 'qwest';

module.exports = {
  getLocation(callback) {
    qwest.get('/location', undefined, {
      responseType: 'json'
    }).then((xhr, response) => {
      callback(undefined, response);
    }).catch((err) => {
      callback(err);
    });
  },

  updateLocation(location, callback) {
    let addr = '/location?lat=' + location.lat + '&lng=' + location.lng;

    qwest.put(addr, undefined, {
      responseType: 'json'
    }).then((xhr, response) => {
      callback(undefined, response);
    }).catch((err) => {
      callback(err);
    });
  }
};
