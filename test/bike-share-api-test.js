import test from 'ava'
import rewire from 'rewire'
import request from 'request';
const jsdom = require("jsdom");
const { JSDOM } = jsdom;
const BikeShareApi = rewire('../bike-share-api.js');
global.td = require('testdouble')

test.beforeEach(t => {
  t.context.consoleLog = td.replace(console, 'log');
  t.context.requestPost = td.replace(request, 'post');
});

test.afterEach(t => {
  td.reset();
});

test('Send POST request and get success', async t => {
  const ajaxPost = BikeShareApi.__get__('ajaxPost');

  const form = { SessionID: 'exampleSessionID' };
  const successResponse = { statusCode: 200 };
  const responseBody = { Message: 'You got it' };
  const error = null;
  td.when(request.post(td.matchers.anything()))
    .thenCallback(null, successResponse, JSON.stringify(responseBody));

  const res = await ajaxPost(form);
  t.is(res, '{"Message":"You got it"}');
});

test('Send POST request and get error response', async t => {
  const ajaxPost = BikeShareApi.__get__('ajaxPost');

  const form = { SessionID: 'exampleSessionID' };
  const successResponse = { statusCode: 500 };
  const responseBody = { Message: 'You got some error' };
  const error = 'You got some error';
  td.when(request.post(td.matchers.anything()))
    .thenCallback(error, successResponse, JSON.stringify(responseBody));

  const res = await ajaxPost(form).catch(error => error);
  t.is(res, 'You got some error');
});

test('Store MemberIdD and Password on initialization', t => {
    t.plan(3);
    const api = new BikeShareApi('Kota', 'myPassword');
    t.is(api.MemberID, 'Kota');
    t.is(api.Password, 'myPassword');
    t.is(api.SessionID, null);
});

test('log', async t => {
    const log = BikeShareApi.__get__('log');
    t.is(await log('foo'), 'foo');
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
