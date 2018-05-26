import test from 'ava'
import rewire from 'rewire'
const SlackNotification = rewire('../slack-notification.js');

test.beforeEach(t => {
  t.context.COLORS = SlackNotification.__get__('COLORS');
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

test('Format make reservation success message', async t => {
  t.plan(7);
  const payload = await SlackNotification.formatMakeReservation({
    Title: 'Reservation success',
    Message: 'Go to port within 20 minutes',
    BikeNo: 'XXX1234',
    Passcode: '0000'
  });
  t.is(payload.text, 'Reservation success');
  const attachment = payload.attachments[0];
  t.is(attachment.color, t.context.COLORS.GREEN300);
  const field = attachment.fields[0];
  t.is(field.title, '自転車番号: XXX1234 パスコード: 0000');
  t.is(field.value, 'Go to port within 20 minutes');
  t.is(field.short, false);
  assertPayloadBase(t, payload);
});

test('Switch error message based on type: no-bikes-error', async t => {
  t.plan(7);

  const noBikesError = {
    ErrorType: 'no-bikes-available',
    ParkingID: '12345'
  };
  const payload = await SlackNotification.formatMakeReservationError(noBikesError);

  t.is(payload.text, '利用予約エラー');
  const attachment = payload.attachments[0];
  t.is(attachment.color, t.context.COLORS.RED300);
  const field = attachment.fields[0];
  t.is(field.title, '指定されたポートに利用可能な自転車がありません');
  t.is(field.value, 'ParkingID:12345');
  t.is(field.short, false);
  assertPayloadBase(t, payload);
});

test('Switch error message based on type: other errors', async t => {
  t.plan(7);

  const otherError = 'Some other error';
  const payload = await SlackNotification.formatMakeReservationError(otherError);

  t.is(payload.text, '利用予約エラー');
  const attachment = payload.attachments[0];
  t.is(attachment.color, t.context.COLORS.RED300);
  const field = attachment.fields[0];
  t.is(field.title, 'Some other error');
  // TODO do not show undefined to users
  t.is(field.value, 'ParkingID:undefined');
  t.is(field.short, false);
  assertPayloadBase(t, payload);
});

test('Format port to attachment with no available counts', async t => {
  t.plan(4);

  const port = {
    AvailableCount: 0,
    PortNameJa: 'X10-1.江戸城',
    PortNameEn: 'X10-1.Edo-joh castle',
    ParkingID: '99999'
  };
  const attachment = await SlackNotification.formatPortToAttachment(port);

  t.is(attachment.color, t.context.COLORS.GRAY300);
  const field = attachment.fields[0];
  t.is(field.title, 'X10-1.江戸城: 0台');
  // TODO do not show undefined to users
  t.is(field.value, 'ParkingID:99999');
  t.is(field.short, false);
});

test('Format port to attachment with 1 available counts', async t => {
  t.plan(4);

  const port = {
    AvailableCount: 1,
    PortNameJa: 'X10-1.江戸城',
    PortNameEn: 'X10-1.Edo-joh castle',
    ParkingID: '99999'
  };
  const attachment = await SlackNotification.formatPortToAttachment(port);

  t.is(attachment.color, t.context.COLORS.YELLOW300);
  const field = attachment.fields[0];
  t.is(field.title, 'X10-1.江戸城: 1台');
  // TODO do not show undefined to users
  t.is(field.value, 'ParkingID:99999');
  t.is(field.short, false);
});

test('Format port to attachment with 3 available counts', async t => {
  t.plan(4);

  const port = {
    AvailableCount: 3,
    PortNameJa: 'X10-1.江戸城',
    PortNameEn: 'X10-1.Edo-joh castle',
    ParkingID: '99999'
  };
  const attachment = await SlackNotification.formatPortToAttachment(port);

  t.is(attachment.color, t.context.COLORS.YELLOW300);
  const field = attachment.fields[0];
  t.is(field.title, 'X10-1.江戸城: 3台');
  // TODO do not show undefined to users
  t.is(field.value, 'ParkingID:99999');
  t.is(field.short, false);
});

test('Format port to attachment with 4 available counts', async t => {
  t.plan(4);

  const port = {
    AvailableCount: 4,
    PortNameJa: 'X10-1.江戸城',
    PortNameEn: 'X10-1.Edo-joh castle',
    ParkingID: '99999'
  };
  const attachment = await SlackNotification.formatPortToAttachment(port);

  t.is(attachment.color, t.context.COLORS.GREEN300);
  const field = attachment.fields[0];
  t.is(field.title, 'X10-1.江戸城: 4台');
  // TODO do not show undefined to users
  t.is(field.value, 'ParkingID:99999');
  t.is(field.short, false);
});

function assertPayloadBase(t, payload) {
  t.is(payload.username, 'Bike Share API');
  t.is(payload.icon_emoji, ':bike:');
}
