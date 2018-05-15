'use strict';

module.exports.ports = (event, context, callback) => {
  const param = JSON.parse(event.body)
  provideBikeShareApi(param).listPorts(param.AreaId)
    .then((ports) => {
      const response = {
        statusCode: 200,
        body: JSON.stringify({
          result: ports
        }),
      };

      callback(null, response);
    })
    .catch((error) => {
      callback(error);
    });

  // Use this code if you don't use the http event with the LAMBDA-PROXY integration
  // callback(null, { message: 'Go Serverless v1.0! Your function executed successfully!', event });
};

module.exports.bikes = (event, context, callback) => {
  const param = JSON.parse(event.body)
  provideBikeShareApi(param).listBikes(event.pathParameters.ParkingID)
    .then((bikes) => {
      const response = {
        statusCode: 200,
        body: JSON.stringify({
          result: bikes
        }),
      };

      callback(null, response);
    })
    .catch((error) => {
      // TODO improve error handling
      callback(error);
    });
};

module.exports.makeReservation = (event, context, callback) => {
  const param = JSON.parse(event.body)
  provideBikeShareApi(param).makeReservation(event.pathParameters.ParkingID)
    .then((result) => {
      const response = {
        statusCode: 200,
        body: JSON.stringify({
          result: result
        }),
      };

      callback(null, response);
    })
    .catch((error) => {
      // TODO improve error handling
      callback(error);
    });
};

module.exports.cancelReservation = (event, context, callback) => {
  const param = JSON.parse(event.body)
  provideBikeShareApi(param).cancelReservation()
    .then((result) => {
      const response = {
        statusCode: 200,
        body: JSON.stringify({
          result: result
        }),
      };

      callback(null, response);
    })
    .catch((error) => {
      // TODO improve error handling
      callback(error);
    });
};

function provideBikeShareApi(param) {
  const BikeShareApi = require('./bike-share-api.js');
  return new BikeShareApi(param.MemberID, param.Password);
};

