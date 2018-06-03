import test from 'ava'
import rewire from 'rewire'
import request from 'request'
import fs from 'fs'
const jsdom = require("jsdom");
const { JSDOM } = jsdom;
const BikeShareApi = rewire('../bike-share-api.js');
global.td = require('testdouble');

test.beforeEach(t => {
  t.context.CONST = BikeShareApi.__get__('CONST');
  td.replace(console, 'log');
  t.context.consoleExplanation = td.explain(console.log);
});

test('Store MemberIdD and Password on initialization', t => {
    t.plan(3);
    const api = new BikeShareApi('Kota', 'myPassword');
    t.is(api.MemberID, 'Kota');
    t.is(api.Password, 'myPassword');
    t.is(api.SessionID, null);
});

test('wrapper of console.log', async t => {
  t.plan(3);
  const log = BikeShareApi.__get__('log');
  t.is(await log('foo'), 'foo');
  t.is(t.context.consoleExplanation.calls.length, 1);
  t.deepEqual(t.context.consoleExplanation.calls[0].args, ['foo']);
});

test('parseDom', async t => {
    const parseDom = BikeShareApi.__get__('parseDom');
    const innerHTML = parseDom('<div id="foo"></div>')
      .then(doc => doc.getElementById('foo').id);
    t.is(await innerHTML, 'foo');
});

test('isPasswordNotChangedLongTimeError', t => {
    t.plan(2);
    const funcName = 'isPasswordNotChangedLongTimeError';
    const isPasswordNotChangedLongTimeError = BikeShareApi.__get__(funcName);
    t.true(isPasswordNotChangedLongTimeError(
      'Foo / The password has not been changed for a long period of time.'));
    t.false(isPasswordNotChangedLongTimeError('other text'));
});

test('listSpecifiedPorts', async t => {
  function toPort(i) {
    return { ParkingID: i.toString() };
  }
  const api = new BikeShareApi('Kota', 'myPassword');
  api.listPorts = areaId => {
    const ports = [1,2,3,4,5].map(toPort);
    return Promise.resolve(ports);
  };

  t.plan(6);
  t.deepEqual(await api.listSpecifiedPorts(0, '1'), [1].map(toPort));
  t.deepEqual(await api.listSpecifiedPorts(0, '5'), [5].map(toPort));
  t.deepEqual(await api.listSpecifiedPorts(0, '3,5,1'), [3,5,1].map(toPort));
  t.deepEqual(await api.listSpecifiedPorts(0, ''), []);
  t.deepEqual(await api.listSpecifiedPorts(0, null), []);
  t.deepEqual(await api.listSpecifiedPorts(0, 'a'), []);
});

test('Parse port names and available count', t => {
  t.plan(3);

  const portHtml = '<a>' +
    'X1-11.江戸城和田倉門前' +
    '<br>' +
    'X1-11.Edo-joh castle Wadakuramon-mae' +
    '<br>' +
    '11台' +
    '</a>';

  const anchorNode = new JSDOM(portHtml).window.document.querySelector("a");
  const parsePortNameAndAvailableCount = BikeShareApi.__get__('parsePortNameAndAvailableCount');
  const portNameAndAvailableCount = parsePortNameAndAvailableCount(anchorNode);
  t.is(portNameAndAvailableCount.PortNameJa, 'X1-11.江戸城和田倉門前');
  t.is(portNameAndAvailableCount.PortNameEn, 'X1-11.Edo-joh castle Wadakuramon-mae');
  t.is(portNameAndAvailableCount.AvailableCount, 11);
});

test('Parse ports', async t => {
  t.plan(3);

  const portsHtml = fs.readFileSync('test/html/ports.html', 'utf8');
  const doc = new JSDOM(portsHtml).window.document;
  const parsePortData = BikeShareApi.__get__('parsePortData');

  const ports = await parsePortData(doc);
  t.is(ports.length, 2);
  t.deepEqual(ports[0], {
    ParkingID: 'ParkingID1',
    ParkingEntID: 'ParkingEntID1',
    ParkingLat: 'ParkingLat1',
    ParkingLon: 'ParkingLon1',
    PortNameJa: 'X1-11.江戸城和田倉門前',
    PortNameEn: 'X1-11.Edo-joh castle Wadakuramon-mae',
    AvailableCount: 20
  });
  t.deepEqual(ports[1], {
    ParkingID: 'ParkingID2',
    ParkingEntID: 'ParkingEntID2',
    ParkingLat: 'ParkingLat2',
    ParkingLon: 'ParkingLon2',
    PortNameJa: 'X1-12.江戸城天守閣',
    PortNameEn: 'X1-11.Edo-joh castle Tenshukaku',
    AvailableCount: 0
  })
});

test('Parse bikes', async t => {
  t.plan(3);

  const portsHtml = fs.readFileSync('test/html/bikes.html', 'utf8');
  const doc = new JSDOM(portsHtml).window.document;
  const parseBikesData = BikeShareApi.__get__('parseBikesData');

  const bikes = await parseBikesData(doc);
  t.is(bikes.length, 2);
  t.deepEqual(bikes[0], {
    CycleID: 'CycleID1',
    CycleTypeNo: 'CycleTypeNo1',
    CycleEntID: 'CycleEntID1',
    CycLat: 'CycLat1',
    CycLon: 'CycLon1',
    AttachID: 'AttachID1',
    CycleName: 'BIKENAME1'
  });
  t.deepEqual(bikes[1], {
    CycleID: 'CycleID2',
    CycleTypeNo: 'CycleTypeNo2',
    CycleEntID: 'CycleEntID2',
    CycLat: 'CycLat2',
    CycLon: 'CycLon2',
    AttachID: 'AttachID2',
    CycleName: 'BIKENAME2'
  });
});

test('Parse success reservation', async t => {
  t.plan(1);

  const reservationHtml = fs.readFileSync('test/html/reservation-success.html', 'utf8');
  const doc = new JSDOM(reservationHtml).window.document;
  const api = new BikeShareApi('Kota', 'dummy-password');

  t.deepEqual(await api.parseReservationResult(doc), {
    Title: 'Reservation success',
    Message: 'You are ready to use bike. Go to port within 10 minutes.',
    BikeNo: 'XXX-9999',
    Passcode: '1234'
  })
});

function ajaxPostArg(t, form) {
  return {
    uri: t.context.CONST.URI,
    form: form,
    encoding: null,
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded'
    }
  }
}

test('A POST request gets success', async t => {
  t.plan(3);
  const form = {
    SessionID: 'dummy-session-id'
  }
  td.replace(request, 'post');
  td.when(request.post(td.matchers.anything()))
    .thenCallback(null, { statusCode: 200 }, 'This is response body');
  const postExplanation = td.explain(request.post);

  const api = new BikeShareApi('Kota', 'myPassword');
  const body = await api.ajaxPost(form);
  t.is(body, 'This is response body');
  t.is(postExplanation.calls.length, 1);
  t.deepEqual(postExplanation.calls[0].args[0], ajaxPostArg(t, form));
});

test('A POST request gets 500 error', async t => {
  t.plan(3);
  const form = {
    SessionID: 'dummy-session-id'
  }
  td.replace(request, 'post');
  td.when(request.post(td.matchers.anything()))
    .thenCallback(null, { statusCode: 500 }, 'This is response body');
  const postExplanation = td.explain(request.post);

  const api = new BikeShareApi('Kota', 'myPassword');
  const body = await api.ajaxPost(form).catch(error => error);
  t.is(body, null);
  t.is(postExplanation.calls.length, 1);
  t.deepEqual(postExplanation.calls[0].args[0], ajaxPostArg(t, form));
});

test('A POST request gets 200 but has error', async t => {
  t.plan(3);
  const form = {};
  td.replace(request, 'post');
  td.when(request.post(td.matchers.anything()))
    .thenCallback('something goes wrong', { statusCode: 200 }, 'This is response body');
  const postExplanation = td.explain(request.post);

  const api = new BikeShareApi('Kota', 'myPassword');
  const sessionId = 'dummy-session-id';
  api.SessionID = sessionId;
  const body = await api.ajaxPost(form).catch(error => error);
  t.is(body, 'something goes wrong');
  t.is(postExplanation.calls.length, 1);
  t.deepEqual(postExplanation.calls[0].args[0],
    ajaxPostArg(t, formWithSessionId(form, sessionId)));
});

test('MemberID cannot be empty', async t => {
  t.plan(1);
  const form = {};
  const api = new BikeShareApi('', 'myPassword');
  t.is(await api.makeSession(form).catch(error => error),
    'MemberID cannot be specified or empty');
});

test('Password cannot be empty', async t => {
  t.plan(2);
  const form = {};
  let api = new BikeShareApi('Kota', '');
  t.is(await api.makeSession(form).catch(error => error),
    'Password cannot be specified or empty');
  api = new BikeShareApi('Kota', null);
  t.is(await api.makeSession(form).catch(error => error),
    'Password cannot be specified or empty');
});

function formWithSessionId(form, SessionID) {
  return Object.assign({}, form, { SessionID: SessionID });
}

test('Skip login if already', async t => {
  t.plan(2);
  const form = {
    EventNo: t.context.CONST.EVENT_IDS.SHOW_PORTS
  }
  const api = new BikeShareApi('Kota', 'dummy-password');
  const sessionId = 'dummy-session-id';
  api.SessionID = sessionId;
  td.replace(api, 'submitForm');
  const explanation = td.explain(api.submitForm)

  t.is(await api.makeSession(form), sessionId);
  t.is(explanation.calls.length, 0);
});

test('makeSession gets success', async t => {
  t.plan(5);
  const form = {
    SessionID: null,
    EventNo: t.context.CONST.EVENT_IDS.SHOW_PORTS
  }
  const api = new BikeShareApi('Kota', 'dummy-password');
  td.replace(api, 'submitForm');

  const sessionId = 'dummy-session-id';
  td.when(api.submitForm(td.matchers.anything()))
    .thenResolve(BikeShareApi.__get__('parseDom')
      (`<div><input name="SessionID" value="${sessionId}"/></div>`));
  const submitFormExplanation = td.explain(api.submitForm);

  t.is(await api.makeSession(form), sessionId);
  t.is(submitFormExplanation.calls.length, 1);
  t.deepEqual(submitFormExplanation.calls[0].args, [{
    EventNo: t.context.CONST.EVENT_IDS.LOGIN,
    MemberID: 'Kota',
    Password: 'dummy-password'
  }]);

  t.is(api.SessionID, null);
  t.is(form.SessionID, null);

});

test('makeSession gets error due to no sessionId dom', async t => {
  t.plan(5);
  const form = {
    SessionID: null,
    EventNo: t.context.CONST.EVENT_IDS.SHOW_PORTS
  }
  const api = new BikeShareApi('Kota', 'dummy-password');
  td.replace(api, 'submitForm');

  td.when(api.submitForm(td.matchers.anything()))
    .thenResolve(BikeShareApi.__get__('parseDom')('<div></div>'));
  const submitFormExplanation = td.explain(api.submitForm);

  t.is(await api.makeSession(form).catch(e=>e), 'SessionID element is not found');
  t.is(submitFormExplanation.calls.length, 1);
  t.deepEqual(submitFormExplanation.calls[0].args, [{
    EventNo: t.context.CONST.EVENT_IDS.LOGIN,
    MemberID: 'Kota',
    Password: 'dummy-password'
  }]);
  // TODO remove side effects
  t.is(api.SessionID, null);
  t.is(form.SessionID, null);

});

test('submitForm', async t => {
  const password = 'dummy-password-submitForm';
  const sessionId = 'dummy-session-id-submitForm';

  const api = new BikeShareApi('Kota', password);
  td.replace(api, 'ajaxPost');
  const CONST = t.context.CONST;
  const loginForm = {
    EventNo: CONST.EVENT_IDS.LOGIN,
    MemberID: 'Kota',
    Password: password
  };
  td.when(api.ajaxPost(loginForm)).thenResolve(
    `<div><input name="SessionID" value="${sessionId}"/></div>`);
  const dummyEventForm = {
    EventNo: 'dummy-event',
    MemberID: 'Kota',
    Password: password,
    SessionID: null
  };
  td.when(api.ajaxPost(dummyEventForm)).thenResolve(
    '<div id="foo">Have fun!</div>');

  const ajaxPostExp = td.explain(api.ajaxPost);

  const dom = await api.submitForm(dummyEventForm);
  t.deepEqual(ajaxPostExp.calls[0].args, [loginForm]);
  t.is(api.SessionID, sessionId);
  t.is(ajaxPostExp.calls.length, 2);
  t.deepEqual(ajaxPostExp.calls[1].args, [dummyEventForm]);
  t.is(dom.getElementById('foo').textContent, 'Have fun!');
});

test('Try to make reservation but there is no bikes.', async t => {
  t.plan(2);

  const api = new BikeShareApi('Kota', 'dummy-password');
  const parkingId = 'someParkingId';

  td.replace(api, 'listBikes');
  td.when(api.listBikes(parkingId)).thenResolve([]);
  td.replace(api, 'submitForm');
  td.replace(api, 'parseReservationResult');
  const submitFormExplanation = td.explain(api.submitForm);

  const reservation = await api.makeReservation(parkingId).catch(e => e);
  t.deepEqual(reservation, {
    ParkingID: parkingId,
    ErrorType: 'no-bikes-available'
  });
  t.is(submitFormExplanation.calls.length, 0);
});

test('Make reservation successfully.', async t => {
  t.plan(3);

  const api = new BikeShareApi('Kota', 'dummy-password');
  const parkingId = 'someParkingId';

  td.replace(api, 'listBikes');
  td.replace(api, 'submitForm');
  td.replace(api, 'parseReservationResult');

  td.when(api.listBikes(parkingId)).thenResolve([{
    CycleID: 'CycleID1',
    AttachID: 'AttachID1',
    CycleTypeNo: 'CycleTypeNo1',
    CycleEntID: 'CycleEntID1'
  }, {
    CycleID: 'CycleID2',
    AttachID: 'AttachID2',
    CycleTypeNo: 'CycleTypeNo2',
    CycleEntID: 'CycleEntID2'
  }]);
  td.when(api.submitForm(td.matchers.anything())).thenResolve('doc');
  const reservationResult = {
    Title: 'title-reservation',
    Message: 'msg-reservation',
    BikeNo: 'XXX-9999',
    Passcode: '1234'
  };
  td.when(api.parseReservationResult('doc')).thenResolve(reservationResult);
  const submitFormExplanation = td.explain(api.submitForm);

  const reservation = await api.makeReservation(parkingId);
  t.deepEqual(reservation, reservationResult);
  const CONST = t.context.CONST;
  t.is(submitFormExplanation.calls.length, 1);
  t.deepEqual(submitFormExplanation.calls[0].args, [{
    EventNo: CONST.EVENT_IDS.MAKE_RESERVATION,
      UserID: CONST.UserID,
      MemberID: 'Kota',
      CycleID: 'CycleID1',
      AttachID: 'AttachID1',
      CycleTypeNo: 'CycleTypeNo1',
      CycleEntID: 'CycleEntID1'
  }]);
});

test('Cancel reservation successfully.', async t => {
  const CONST = t.context.CONST;
  const api = new BikeShareApi('Kota', 'dummy-password');
  td.replace(api, 'submitForm');
  td.when(api.submitForm(td.matchers.anything())).thenResolve('doc');
  const submitFormExplanation = td.explain(api.submitForm);

  t.is(await api.cancelReservation(), 'doc');
  t.is(submitFormExplanation.calls.length, 1);
  t.deepEqual(submitFormExplanation.calls[0].args, [{
    EventNo: CONST.EVENT_IDS.CANCEL_RESERVATION,
    UserID: CONST.UserID,
    MemberID: 'Kota'
  }]);
});