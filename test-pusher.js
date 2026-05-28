const Pusher = require('pusher');

const pusher = new Pusher({
  appId: "215914",
  key: "18e355bfbafee7a1aa57",
  secret: "88dae70475dc4b8453a7",
  cluster: "eu",
  useTLS: true
});

async function testPusher() {
    try {
        console.log("Triggering test event...");
        await pusher.trigger('competition-6a17a9e6f8f3c243efa00d11', 'student-joined', {
            studentId: "test-id",
            userName: "Test User"
        });
        console.log("Test event triggered successfully!");
    } catch (e) {
        console.error("Failed to trigger event:", e);
    }
}

testPusher();
