import amqp from "amqplib";

let channel: amqp.Channel;

export const connectRabbitMQ = async () => {
  try {
    const connection = await amqp.connect(process.env.RABBITMQ_URL!);

    connection.on("error", (err) => {
      console.error("RabbitMQ connection error (restaurant service):", err.message);
    });

    connection.on("close", () => {
      console.warn("RabbitMQ connection closed (restaurant service), reconnecting in 5s...");
      setTimeout(connectRabbitMQ, 5000);
    });

    channel = await connection.createChannel();

    channel.on("error", (err) => {
      console.error("RabbitMQ channel error (restaurant service):", err.message);
    });

    channel.on("close", () => {
      console.warn("RabbitMQ channel closed (restaurant service)");
    });

    await channel.assertQueue(process.env.PAYMENT_QUEUE!, {
      durable: true,
    });

    await channel.assertQueue(process.env.RIDER_QUEUE!, {
      durable: true,
    });

    await channel.assertQueue("review.created", {
      durable: true,
    });

    await channel.assertQueue("menuitem.embed", {
      durable: true,
    });

    console.log("🐇 connected To Rabbitmq(restaurant service)");
  } catch (err: any) {
    console.error("Failed to connect to RabbitMQ (restaurant service):", err.message);
    setTimeout(connectRabbitMQ, 5000);
  }
};

export const getChannel = () => channel;
