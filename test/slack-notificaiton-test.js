import test from 'ava'
import SlackNotification from '../slack-notification.js'

test.beforeEach(t => {
  t.context.slack = new SlackNotification('');
});

test('Format simple text', async t => {
  t.plan(3);
  const payload = await SlackNotification.formatSimpleText({msg: 'Hello!'});
  t.is(payload.text, '{"msg":"Hello!"}');
  t.is(payload.username, 'Bike Share API');
  t.is(payload.icon_emoji, ':bike:');
});
