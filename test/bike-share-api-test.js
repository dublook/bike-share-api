import test from 'ava'
import rewire from 'rewire'
import request from 'request'
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
  const form = {
    SessionID: 'dummy-session-id'
  }
  td.replace(request, 'post');
  td.when(request.post(td.matchers.anything()))
    .thenCallback('something goes wrong', { statusCode: 200 }, 'This is response body');
  const postExplanation = td.explain(request.post);

  const api = new BikeShareApi('Kota', 'myPassword');
  const body = await api.ajaxPost(form).catch(error => error);
  t.is(body, 'something goes wrong');
  t.is(postExplanation.calls.length, 1);
  t.deepEqual(postExplanation.calls[0].args[0], ajaxPostArg(t, form));
});

test('MemberID cannot be empty', async t => {
  t.plan(1);
  const form = {
    SessionID: null,
  }
  const api = new BikeShareApi('', 'myPassword');
  t.is(await api.makeSession(form).catch(error => error),
    'MemberID cannot be specified or empty');
});

test('Password cannot be empty', async t => {
  t.plan(2);
  const form = {
    SessionID: null,
  }
  let api = new BikeShareApi('Kota', '');
  t.is(await api.makeSession(form).catch(error => error),
    'Password cannot be specified or empty');
  api = new BikeShareApi('Kota', null);
  t.is(await api.makeSession(form).catch(error => error),
    'Password cannot be specified or empty');
});

test('Skip login if already', async t => {
  t.plan(2);
  const form = {
    SessionID: 'dummy-session-id',
    EventNo: t.context.CONST.EVENT_IDS.SHOW_PORTS
  }
  const api = new BikeShareApi('Kota', 'dummy-password');
  td.replace(api, 'submitForm');
  const explanation = td.explain(api.submitForm)

  t.is(await api.makeSession(form), undefined);
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

  td.when(api.submitForm(td.matchers.anything()))
    .thenResolve(BikeShareApi.__get__('parseDom')
      ('<div><input name="SessionID" value="dummy-session-id"/></div>'));
  const submitFormExplanation = td.explain(api.submitForm);

  t.is(await api.makeSession(form), undefined);
  t.is(submitFormExplanation.calls.length, 1);
  t.deepEqual(submitFormExplanation.calls[0].args, [{
    EventNo: t.context.CONST.EVENT_IDS.LOGIN,
    MemberID: 'Kota',
    Password: 'dummy-password'
  }]);
  // TODO remove side effects
  t.is(api.SessionID, 'dummy-session-id');
  t.is(form.SessionID, 'dummy-session-id');

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
  t.deepEqual(ajaxPostExp.calls[1].args, [Object.assign({
    SessionID: sessionId
  }, dummyEventForm)]);
  t.is(dom.getElementById('foo').textContent, 'Have fun!');
});