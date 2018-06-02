'use strict';

const request = require('request');
const jsdom = require("jsdom");
const { JSDOM } = jsdom;
const iconv = require('iconv-lite');

const CONST = {
  URI: 'https://tcc.docomo-cycle.jp/cycle/TYO/cs_web_main.php',
  UserID: 'TYO',
  AreaEntID: 'TYO',
  ParkingEntID: 'TYO'
};
CONST.AREAD_IDS = {
  CHIYODA: '1',
  CHUO: '2',
  MINATO: '3',
  KOTO: '4',
  SHINJUKU: '5',
  BUNKYO: '6',
  OTA: '7',
  SHIBUYA: '8',
  SHINAGAWA: '10'
};
CONST.EVENT_IDS = {
  LOGIN: '21401',
  SHOW_PORTS: '21614',
  BIKES: '25701',
  MAKE_RESERVATION: '25901',
  CANCEL_RESERVATION: '27901'
};

/**
 * @constructor
 */
function BikeShareApi(MemberID, Password) {
  this.MemberID = MemberID;
  this.Password = Password;
  this.SessionID = null;
}

BikeShareApi.prototype.ajaxPost = function(form) {
  const options = {
    uri: CONST.URI,
    form: form,
    encoding: null, // disable auto encoding by request module
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded'
    }
  };
  return new Promise((resolve, reject) => {
    request.post(options, function(error, response, body){
      if (!error && response.statusCode === 200) {
        resolve(body);
      } else {
        reject(error);
      }
    });
  });
}

BikeShareApi.prototype.submitForm = function(form, opt_logHtml) {
  function convertShiftJisToUtf8(shiftJisText) {
    var buf = new Buffer(shiftJisText, 'binary');
    var utf8Text = iconv.decode(buf, 'Shift_JIS');
    return Promise.resolve(utf8Text);
  }
  return this.makeSession(form)
    .then(() => this.ajaxPost(form))
    .then(convertShiftJisToUtf8)
    .then((html) => opt_logHtml ? log(html) : html)
    .then(parseDom)
    .then(checkErrorText);
};


BikeShareApi.prototype.makeSession = function(requestForm) {
  function isBlank(str) {
    return (!str || /^\s*$/.test(str));
  }
  function parseSessionId(doc) {
    const sessionId = doc.querySelector('input[name="SessionID"]');
    if (sessionId) {
      return Promise.resolve(sessionId.value);
    } else {
      return Promise.reject('SessionID element is not found');
    }
  }
  function needInterceptAndLogin() {
    return requestForm.EventNo !== CONST.EVENT_IDS.LOGIN
      && requestForm.SessionID == null;
  }

  if (!needInterceptAndLogin()) {
    // already login
    return Promise.resolve();
  }

  if (isBlank(this.MemberID)) {
    return Promise.reject('MemberID cannot be specified or empty');
  } else if (isBlank(this.Password)) {
    return Promise.reject('Password cannot be specified or empty');
  }

  const loginForm = {
    EventNo: CONST.EVENT_IDS.LOGIN,
    // "GarblePrevention": "%82o%82n%82r%82s%83f%81%5B%83%5E",
    MemberID: this.MemberID,
    Password: this.Password
  };
  console.log('Try to login');
  return this.submitForm(loginForm)
    .then(parseSessionId)
    .then((sessionId) => {
      console.log('Successfully login');
      this.SessionID = sessionId;
      requestForm.SessionID = sessionId;
    })
    .catch((error) => {
      console.log('Authentication failed. Check your memberID and password');
      return Promise.reject(error);
    });
};

BikeShareApi.prototype.listPorts = function(areaId) {
  const form = {
    EventNo: CONST.EVENT_IDS.SHOW_PORTS,
    SessionID: this.SessionID,
    MemberID: this.MemberID,
    UserID: CONST.UserID,
    GetInfoNum: '120',
    GetInfoTopNum: '1',
    MapType: '1',
    MapCenterLat: '',
    MapCenterLon: '',
    MapZoom: '13',
    AreaEntID: '',
    AreaID: areaId
  };
  console.log('Try to get port list');
  return this.submitForm(form)
    .then(parsePortData);
};

BikeShareApi.prototype.listSpecifiedPorts = function(areaId, parkingIdsQuery) {
  if (!parkingIdsQuery) {
    return Promise.resolve([]);
  }
  const specifiedParkingIds = parkingIdsQuery.split(',');
  const indexOf = port => specifiedParkingIds.indexOf(port.ParkingID);
  const isSpecified = port => indexOf(port) > -1;
  const BySpecifiedOrder = (p1, p2) =>  indexOf(p1) - indexOf(p2);
  return this.listPorts(areaId)
    .then(ports => ports.filter(isSpecified).sort(BySpecifiedOrder));
};

function log(param) {
  console.log(param);
  return Promise.resolve(param);
}

function loggerError(param) {
  console.log(param);
  return Promise.reject(param);
}

function parseDom(responseBody) {
  try {
    const dom = new JSDOM(responseBody);
    return Promise.resolve(dom.window.document);
  } catch (error) {
    return Promise.reject(error);
  }
}

function isPasswordNotChangedLongTimeError(textContent) {
  return textContent && textContent
      .indexOf('The password has not been changed') > -1;
}

function checkErrorText(doc) {
  const errText = doc.querySelector('.err_text');
  if (errText && !isPasswordNotChangedLongTimeError(errText.textContent)) {
    return Promise.reject(errText.textContent);
  }
  return Promise.resolve(doc);
}


function parsePortData(body) {
  const selector = 'div.main_inner_wide_box form[name^="tab_"]';
  const portForms = body.querySelectorAll(selector);
  console.log('portForms.length: ' + portForms.length);
  const portDataList = Array.prototype.map.call(portForms, (formElement) => {
    var portData = {};
    formElement.childNodes.forEach((node) => {
      if (node.nodeName === 'INPUT') {
        switch (node.name) {
          case 'ParkingID':
          case 'ParkingEntID':
          case 'ParkingLat':
          case 'ParkingLon':
            portData[node.name] = node.value;
            break;
        }
      } else if (node.nodeName === 'DIV') {
        const anchorInner = node.querySelector('a');
        Object.assign(portData, parsePortNameAndAvailableCount(anchorInner));
      }
    });
    return portData;
  });
  return Promise.resolve(portDataList);
}

function parsePortNameAndAvailableCount(anchorNode) {
  const rows = anchorNode.innerHTML.split('<br>');
  return {
    PortNameJa: rows[0],
    PortNameEn: rows[1],
    AvailableCount: parseInt(rows[2].match(/\d+/)[0], 10)
  };
}

BikeShareApi.prototype.listBikes = function(parkingId) {
  const form = {
    ParkingEntID: CONST.ParkingEntID,
    ParkingID: parkingId,
    EventNo: CONST.EVENT_IDS.BIKES,
    SessionID: this.SessionID,
    MemberID: this.MemberID,
    UserID: CONST.UserID,
    GetInfoNum: '20',
    GetInfoTopNum: '1',
    ParkingLat: '',
    ParkingLon: ''
  };
  console.log('Try to get bike list for parkingId: ' + parkingId);
  return this.submitForm(form)
    .then(parseBikesData);
};

function parseBikesData(body) {
  // TODO remove duplication
  const selector = 'div.main_inner_wide_box form[name^="tab_"]';
  const forms = body.querySelectorAll(selector);
  console.log(forms.length + ' bikes loaded');
  const dataList = Array.prototype.map.call(forms, (formElement) => {
    var data = {};
    formElement.childNodes.forEach((node) => {
      if (node.nodeName === 'INPUT') {
        switch (node.name) {
          case 'CycleID':
          case 'CycleTypeNo':
          case 'CycleEntID':
          // case 'CenterLat':
          // case 'CenterLon':
          case 'CycLat':
          case 'CycLon':
          case 'AttachID':
            data[node.name] = node.value;
            break;
        }
      } else if (node.nodeName === 'DIV') {
        var anchorInnerHtml = node.querySelector('a').innerHTML;
        data['CycleName'] = anchorInnerHtml;
      }
    });
    return data;
  });
  return Promise.resolve(dataList);
}

BikeShareApi.prototype.makeReservation = function(parkingId) {
  return this.listBikes(parkingId)
    .then(bikes => {
      if (bikes.length > 0) {
        const firstBike = bikes[0];
        return Promise.resolve(firstBike);
      } else {
        const error = {
          ParkingID: parkingId,
          ErrorType: 'no-bikes-available'
        };
        return Promise.reject(error);
      }
    })
    .then(bike => {
      return {
        EventNo: CONST.EVENT_IDS.MAKE_RESERVATION,
        SessionID: this.SessionID,
        UserID: CONST.UserID,
        MemberID: this.MemberID,
        CycleID: bike.CycleID,
        AttachID: bike.AttachID,
        CycleTypeNo: bike.CycleTypeNo,
        CycleEntID: bike.CycleEntID
      };
    })
    .then(form => this.submitForm(form))
    .then(parseReservationResult)
    .catch(loggerError);
};

function parseReservationResult(doc) {
  const messageTitle = doc.querySelector('.tittle_h1').textContent;
  const mainInner = doc.querySelector('.main_inner_wide');
  const regxHeadSpaces = /^[ |\n\t　]+(.+)[ |\n\t　]*$/g;
  function childNodeText(nodeIndex) {
    return mainInner.childNodes[nodeIndex].textContent.replace(regxHeadSpaces, '$1');
  }
  return Promise.resolve({
    Title: messageTitle,
    Message: childNodeText(2),
    BikeNo: childNodeText(8),
    Passcode: childNodeText(15)
  });
}

BikeShareApi.prototype.cancelReservation = function() {
  const form = {
    EventNo: CONST.EVENT_IDS.CANCEL_RESERVATION,
    SessionID: this.SessionID,
    UserID: CONST.UserID,
    MemberID: this.MemberID
  };
  return this.submitForm(form)
    .catch(loggerError);
};

module.exports = BikeShareApi;
