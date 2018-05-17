const request = require('request');

function SlackNotification(webhookUrl) {
  this.webhookUrl = webhookUrl;
}

SlackNotification.prototype.sendNotification = function(text) {
  const payload = {
    text: text,
    username: 'Bike Share API',
    icon_emoji: ':bike:'
  };
  const options = {
    uri: this.webhookUrl,
    json: payload,
    headers: {
      'Content-Type': 'application/json'
    }
  };
  return new Promise((resolve, reject) => {
    request.post(options, (error, response, body) => {
      if (!error && response.statusCode === 200) {
        resolve(body);
      } else {
        reject(body);
      }
    });
  });
};

module.exports = SlackNotification;