import test from 'ava'
import SlackNotification from '../slack-notification.js'

test.beforeEach(t => {
  t.context.slack = new SlackNotification('');
});

test('Format simple text', async t => {
  t.plan(3);
  const payload = await SlackNotification.formatSimpleText({msg: 'Hello!'});
  t.is(payload.text, '{"msg":"Hello!"}');
  assertPayloadBase(t, payload);
});

test('Format reservation cancellation success message', async t => {
  t.plan(3);
  const payload = await SlackNotification.formatCancelReservation({
    Message: 'Cancellation success'
  });
  t.is(payload.text, 'Cancellation success');
  assertPayloadBase(t, payload);
});

function assertPayloadBase(t, payload) {
  t.is(payload.username, 'Bike Share API');
  t.is(payload.icon_emoji, ':bike:');
}
