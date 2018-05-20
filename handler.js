'use strict';

const Slack = require('./slack-notification.js');

module.exports.ports = (event, context, callback) => {
  const param = JSON.parse(event.body);
  provideBikeShareApi(param)
    .listPorts(event.pathParameters.AreaID)
    .then(sendNotification(param, Slack.formatPorts))
    .then(responseSuccess(callback))
    .catch(responseError(callback));
};

module.exports.portsSpecified = (event, context, callback) => {
  const param = JSON.parse(event.body);
  provideBikeShareApi(param)
    .listSpecifiedPorts(event.pathParameters.AreaID, event.pathParameters.ParkingIds)
    .then(sendNotification(param, Slack.formatPorts))
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
    .then(sendNotification(param, Slack.formatMakeReservation))
    .then(responseSuccess(callback))
    .catch(sendNotification(param, Slack.formatMakeReservationError,
      responseError(callback)));
};

module.exports.cancelReservation = (event, context, callback) => {
  const param = JSON.parse(event.body);
  provideBikeShareApi(param).cancelReservation()
    .then(r => {
      return { Message: '利用予約の取消が完了しました' };
    })
    .then(sendNotification(param, Slack.formatCancelReservation))
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
    return Promise.resolve(error);
  }
}

function sendNotification(param, opt_formatter, opt_resolver) {
  return result => {
    const resolver = value => {
      if (opt_resolver) {
        return Promise.resolve(value).then(opt_resolver);
      } else {
        return Promise.resolve(value);
      }
    };
    if (!param.slackWebhookUrl) {
      return resolver(result);
    }
    try {
      const formatter = opt_formatter || Slack.formatSimpleText;
      const slack = new Slack(param.slackWebhookUrl);
      console.log('Try to send Slack notification');
      return formatter(result)
        .then(payload => slack.sendNotification(payload))
        .then(slackRes => {
          console.log(`Slack notification response: ${slackRes}`);
          return resolver(result);
        })
        .catch(error => {
          console.log(`Failed to send slack notification: ${JSON.stringify(error)}`);
          return resolver(result);
        });
    } catch (error) {
      console.log(`Failed to send slack notification: ${error}`);
    }

    return resolver(result);
  }
}
