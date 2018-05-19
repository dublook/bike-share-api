import test from 'ava'
import rewire from 'rewire'
const BikeShareApi = rewire('../bike-share-api.js');

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