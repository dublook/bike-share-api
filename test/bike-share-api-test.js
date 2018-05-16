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