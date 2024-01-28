const amqp = require("amqplib/callback_api");
const axios = require("axios");
const cheerio = require("cheerio");

const scraperNum = process.env.SCRAPER_NUMBER;

const scrapeWebsite = async (url) => {
  try {
    const response = await axios.get(url);
    const $ = cheerio.load(response.data);
    // Example: Extracting titles from a webpage
    const titles = [];
    $("h1, h2, h3").each((index, element) => {
      titles.push($(element).text());
    });
    return titles;
  } catch (error) {
    console.error(
      "scraper number" + scraperNum + ": Error scraping website:",
      error.message
    );
    return [];
  }
};

amqp.connect("amqp://user:password@rabbitmq:5672", function (err, connection) {
  if (err) {
    throw err;
  }

  connection.createChannel(function (err, channel) {
    if (err) {
      throw err;
    }

    const queue = "scrape_request";
    const responseQueue = "scheduler_response_queue";

    channel.assertQueue(queue, {
      durable: false,
    });

    channel.assertQueue(responseQueue, { durable: false });

    console.log(scraperNum + " [*] Waiting for messages in %s.", queue);

    channel.consume(
      queue,
      async (msg) => {
        console.log(
          "Scraper " + scraperNum + " [x] received %s",
          msg.content.toString()
        );

        const url = msg.content.toString();
        const titles = await scrapeWebsite(url);

        const responseMsg = titles.join(", ");
        channel.sendToQueue(responseQueue, Buffer.from(responseMsg));
        console.log("Scraper " + scraperNum + " sent:", responseMsg);
      },
      {
        noAck: true,
      }
    );
  });
});
