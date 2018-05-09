const request = require('request');
const jsdom = require("jsdom");
const { JSDOM } = jsdom;
const iconv = require('iconv-lite');

const bikeshareapi = {};

bikeshareapi.CONST = {
  URI: 'https://tcc.docomo-cycle.jp/cycle/TYO/cs_web_main.php',
  UserID: 'TYO',
  AreaEntID: 'TYO',
  ParkingEntID: 'TYO'
};
bikeshareapi.CONST.AREAD_IDS = {
  CHIYODA: '1',
  CHUO: '2',
  MINATO: '3',
  KOTO: '4',
  SHINJUKU: '5',
  BUNKYO: '6',
  OTA: '7',
  SHIBUYA: '8',
  SHINAGAWA: '10',
};
bikeshareapi.CONST.EVENT_IDS = {
  LOGIN: '21401',
  SHOW_PORTS: '21614',
  BIKES: '25701'
};

bikeshareapi.sessionInfo = {
  MemberID: null,
  Password: null,
  SessionID: null
};

bikeshareapi.ajaxPost = function(form) {
  var options = {
    uri: bikeshareapi.CONST.URI,
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
};

bikeshareapi.submitForm = function(form, opt_logHtml) {
  function convertShiftJisToUtf8(shiftJisText) {
    var buf = new Buffer(shiftJisText, 'binary');
    var utf8Text = iconv.decode(buf, 'Shift_JIS');
    return Promise.resolve(utf8Text);
  }
  return bikeshareapi.makeSession(form)
    .then(() => bikeshareapi.ajaxPost(form))
    .then(convertShiftJisToUtf8)
    .then((html) => opt_logHtml ? bikeshareapi.log(html) : html)
    .then(bikeshareapi.parseDom)
    .then(bikeshareapi.checkErrorText);
};


bikeshareapi.makeSession = function(requestForm) {
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
  };
  function needInterceptAndLogin() {
    return requestForm.EventNo !== bikeshareapi.CONST.EVENT_IDS.LOGIN
      && requestForm.SessionID == null;
  }

  if (!needInterceptAndLogin()) {
    // arleady login
    return Promise.resolve();
  }

  if (isBlank(bikeshareapi.sessionInfo.MemberID)) {
    return Promise.reject('MemberID cannot be specified or empty');
  } else if (isBlank(bikeshareapi.sessionInfo.Password)) {
    return Promise.reject('Password cannot be specified or empty');
  }

  const loginForm = {
    EventNo: bikeshareapi.CONST.EVENT_IDS.LOGIN,
    // "GarblePrevention": "%82o%82n%82r%82s%83f%81%5B%83%5E",
    MemberID: bikeshareapi.sessionInfo.MemberID,
    Password: bikeshareapi.sessionInfo.Password
  };
  console.log('Try to login');
  return bikeshareapi.submitForm(loginForm)
    .then(parseSessionId)
    .then((sessionId) => {
      console.log('Successfully login');
      bikeshareapi.sessionInfo.SessionID = sessionId;
      requestForm.SessionID = sessionId;
    });
};

bikeshareapi.listPorts = function(areaId) {
  const form = {
    EventNo: bikeshareapi.CONST.EVENT_IDS.SHOW_PORTS,
    SessionID: bikeshareapi.sessionInfo.SessionID,
    MemberID: bikeshareapi.sessionInfo.MemberID,
    UserID: bikeshareapi.CONST.UserID,
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
  return bikeshareapi.submitForm(form)
    .then(bikeshareapi.parsePortData);
};

bikeshareapi.log = function(param) {
  console.log(param);
  return Promise.resolve(param);
}

bikeshareapi.parseDom = function(responseBody) {
  try {
    const dom = new JSDOM(responseBody);
    return Promise.resolve(dom.window.document);
  } catch (error) {
    return Promise.reject(error);
  }
};

bikeshareapi.checkErrorText = function(doc) {
  const errText = doc.querySelector('.err_text');
  if (errText) {
    return Promise.reject(errText.innerHTML);
  }
  return Promise.resolve(doc);
};


bikeshareapi.parsePortData = function(body) {
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
        var anchorInnerHtml = node.querySelector('a').innerHTML;
        var splitted = anchorInnerHtml.split('<br>');
        portData['portNameJa'] = splitted[0];
        portData['portNameEn'] = splitted[1];
        portData['availableCount'] = Number(splitted[2].split('台')[0]);
      }
    });
    return portData;
  });
  return Promise.resolve(portDataList);
};

bikeshareapi.listBikes = function(parkingId) {
  const form = {
    ParkingEntID: bikeshareapi.CONST.ParkingEntID,
    ParkingID: parkingId,
    EventNo: bikeshareapi.CONST.EVENT_IDS.BIKES,
    SessionID: bikeshareapi.sessionInfo.SessionID,
    MemberID: bikeshareapi.sessionInfo.MemberID,
    UserID: bikeshareapi.CONST.UserID,
    GetInfoNum: '20',
    GetInfoTopNum: '1',
    ParkingLat: '',
    ParkingLon: ''
  };
  console.log('Try to get bike list for parkingId: ' + parkingId);
  return bikeshareapi.submitForm(form)
    .then(bikeshareapi.parseBikesData);
};

bikeshareapi.parseBikesData = function(body) {
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
          case 'CycleID':
          case 'CycleTypeNo':
          case 'CycleEntID':
          case 'CenterLat':
          case 'CenterLon':
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
};

exports.bikeshareapi = bikeshareapi;
