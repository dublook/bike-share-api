'use strict';

const SlackNotification = require('./slack-notification.js');

module.exports.ports = (event, context, callback) => {
  const param = JSON.parse(event.body);
  provideBikeShareApi(param)
    .listPorts(event.pathParameters.AreaID)
    .then(responseSuccess(callback))
    .catch(responseError(callback));
};

module.exports.bikes = (event, context, callback) => {
  const param = JSON.parse(event.body);
  provideBikeShareApi(param)
    .listBikes(event.pathParameters.ParkingID)
    .then(responseSuccess(callback))
    .catch(responseError(callback));
};

module.exports.makeReservation = (event, context, callback) => {
  const param = JSON.parse(event.body);
  provideBikeShareApi(param)
    .makeReservation(event.pathParameters.ParkingID)
    .then(sendNotification(param))
    .then(responseSuccess(callback))
    .catch(responseError(callback));
};

module.exports.cancelReservation = (event, context, callback) => {
  const param = JSON.parse(event.body);
  provideBikeShareApi(param).cancelReservation()
    .then(r => {
      return { Message: '利用予約の取消が完了しました' };
    })
    .then(sendNotification(param))
    .then(responseSuccess(callback))
    .catch(responseError(callback));
};

function provideBikeShareApi(param) {
  const BikeShareApi = require('./bike-share-api.js');
  return new BikeShareApi(param.MemberID, param.Password);
}

function responseSuccess(callback) {
  return result => {
    const response = {
      statusCode: 200,
      body: JSON.stringify({
        result: result
      })
    };

    callback(null, response);
  }
}

function responseError(callback) {
  // TODO improve error handling
  return error => {
    callback(error);
  }
}

function sendNotification(param) {
  return result => {
    const resolve = Promise.resolve(result);
    if (param.slackWebhookUrl) {
      try {
        const slack = new SlackNotification(param.slackWebhookUrl);
        console.log('Try to send Slack notification');
        return slack.sendNotification(JSON.stringify(result))
          .then(slackRes => {
            console.log(`Slack notification response: ${slackRes}`);
            return resolve;
          })
          .catch(error => {
            console.log(error);
            return resolve;
          });
      } catch (error) {
        console.log(`Failed to send slack notification error`);
      }
    }

    return resolve;
  }
}
