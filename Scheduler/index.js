const amqp = require("amqplib/callback_api");

const urls = [
  "https://cheerio.js.org/",
  "https://example.org/",
  "https://jsonplaceholder.typicode.com/",
];

const getRandomUrl = () => {
  const randomIndex = Math.floor(Math.random() * urls.length);
  return urls[randomIndex];
};

amqp.connect("amqp://user:password@rabbitmq:5672", function (err, connection) {
  if (err) {
    throw err;
  }

  console.log("[AMQP] connected");

  connection?.createChannel(function (err, channel) {
    const queue = "scrape_request";
    channel.assertQueue(queue, { durable: false });

    const responseQueue = "scheduler_response_queue";
    channel.assertQueue(responseQueue, { durable: false });

    setInterval(() => {
      const msg = getRandomUrl();
      channel.sendToQueue(queue, Buffer.from(msg));
      console.log("Scheduler [x] sent %s", msg);
    }, 10000);

    channel.consume(
      responseQueue,
      (msg) => {
        if (msg !== null) {
          console.log("Received response:", msg.content.toString());
        }
      },
      { noAck: true }
    );
  });
});
