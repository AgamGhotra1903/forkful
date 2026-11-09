import amqp from "amqplib";

let channel: amqp.Channel;

export const connectRabbitMQ = async () => {
  try {
    const connection = await amqp.connect(process.env.RABBITMQ_URL!);

    connection.on("error", (err) => {
      console.error("RabbitMQ connection error (utils service):", err.message);
    });

    connection.on("close", () => {
      console.warn("RabbitMQ connection closed (utils service), reconnecting in 5s...");
      setTimeout(connectRabbitMQ, 5000);
    });

    channel = await connection.createChannel();

    channel.on("error", (err) => {
      console.error("RabbitMQ channel error (utils service):", err.message);
    });

    channel.on("close", () => {
      console.warn("RabbitMQ channel closed (utils service)");
    });

    await channel.assertQueue(process.env.PAYMENT_QUEUE!, {
      durable: true,
    });

    console.log("🐇 connected To Rabbitmq");
  } catch (err: any) {
    console.error("Failed to connect to RabbitMQ (utils service):", err.message);
    setTimeout(connectRabbitMQ, 5000);
  }
};

export const getChannel = () => channel;
