const request = require('request');

function SlackNotification(webhookUrl) {
  this.webhookUrl = webhookUrl;
}

// From https://material.io/design/color/#tools-for-picking-colors
const COLORS = {
  GREEN300: '#81C784',
  GRAY300: '#E0E0E0',
  YELLOW300: '#FFF176'
};

const PAYLOAD_BASE = {
  username: 'Bike Share API',
  icon_emoji: ':bike:' // TODO wanna get our own icon!
};

SlackNotification.formatSimpleText = function(obj) {
  const payload = Object.assign({
    text: JSON.stringify(obj)
  }, PAYLOAD_BASE);
  return Promise.resolve(payload);
};

SlackNotification.formatCancelReservation = function(res) {
  const payload = Object.assign({
    text: res.Message
  }, PAYLOAD_BASE);
  return Promise.resolve(payload);
};

SlackNotification.formatMakeReservation = function(res) {
  const payload = Object.assign({
    "text": `${res.Title}`,
    "attachments": [
      {
        "color": COLORS.GREEN300,
        "fields":[
          {
            title: `自転車番号: ${res.BikeNo} パスコード: ${res.Passcode}`,
            value: `${res.Message}`,
            "short":false
          }
        ]
      }
    ]
  }, PAYLOAD_BASE);
  return Promise.resolve(payload);
};

SlackNotification.formatPortToAttachment = port => {
  const color = (availableCount => {
    if (availableCount > 3) {
      return COLORS.GREEN300;
    } else if (availableCount > 0) {
      return COLORS.YELLOW300;
    } else {
      return COLORS.GRAY300;
    }
  })(port.AvailableCount);
  return {
    //"fallback":"ポート一覧",
    //"pretext":"ポート一覧",
    "color": color,
    "fields":[
      {
        title: `${port.PortNameJa}: ${port.AvailableCount}台`,
        value: `ID:${port.ParkingID}`,
        "short":false
      }
    ]
  };
};

SlackNotification.formatPorts = function(ports) {
  const payload = Object.assign({
    "text": ports.length === 0 ? 'ポートが見つかりませんでした' : `${ports.length}箇所のポートの利用可能台数`,
    "attachments": ports.map(SlackNotification.formatPortToAttachment)
  }, PAYLOAD_BASE);
  return Promise.resolve(payload);
};


SlackNotification.prototype.sendNotification = function(payload) {
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