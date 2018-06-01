import test from 'ava'
import rewire from 'rewire'
import request from 'request'
const jsdom = require("jsdom");
const { JSDOM } = jsdom;
const BikeShareApi = rewire('../bike-share-api.js');
global.td = require('testdouble');

test.beforeEach(t => {
  t.context.CONST = BikeShareApi.__get__('CONST');
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

  const ajaxPost = BikeShareApi.__get__('ajaxPost');
  const body = await ajaxPost(form);
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

  const ajaxPost = BikeShareApi.__get__('ajaxPost');
  const body = await ajaxPost(form).catch(error => error);
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

  const ajaxPost = BikeShareApi.__get__('ajaxPost');
  const body = await ajaxPost(form).catch(error => error);
  t.is(body, 'something goes wrong');
  t.is(postExplanation.calls.length, 1);
  t.deepEqual(postExplanation.calls[0].args[0], ajaxPostArg(t, form));
});