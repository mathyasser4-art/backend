const Pusher = require('pusher');

const pusher = new Pusher({
  appId: 'a9bd7220-9875-427f-bca9-118afa4daae8',
  key: 'app_e4ed3fcd3045501a594c2640c4d2dd75832ff677',
  secret: 'ab926e78f50933b8eba7956b5cc7c03ed794ae83ad1574891c2e19d4d05486bb',
  cluster: 'us',
  host: 'ws-us.apinator.io',
  useTLS: true
});

async function testPusher() {
    try {
        console.log('Triggering test event...');
        await pusher.trigger('competition-6a17a9e6f8f3c243efa00d11', 'student-joined', {
            studentId: 'test-id',
            userName: 'Test User'
        });
        console.log('Test event triggered successfully!');
    } catch (e) {
        console.error('Failed to trigger event:', e);
    }
}

testPusher();
