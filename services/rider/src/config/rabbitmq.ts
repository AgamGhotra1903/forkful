import amqp from "amqplib";

let channel: amqp.Channel;

export const connectRabbitMQ = async () => {
  try {
    const connection = await amqp.connect(process.env.RABBITMQ_URL!);

    connection.on("error", (err) => {
      console.error("RabbitMQ connection error (rider service):", err.message);
    });

    connection.on("close", () => {
      console.warn("RabbitMQ connection closed (rider service), reconnecting in 5s...");
      setTimeout(connectRabbitMQ, 5000);
    });

    channel = await connection.createChannel();

    channel.on("error", (err) => {
      console.error("RabbitMQ channel error (rider service):", err.message);
    });

    channel.on("close", () => {
      console.warn("RabbitMQ channel closed (rider service)");
    });

    await channel.assertQueue(process.env.RIDER_QUEUE!, {
      durable: true,
    });
    await channel.assertQueue(process.env.ORDER_READY_QUEUE!, {
      durable: true,
    });

    console.log("🐇 connected To Rabbitmq(rider service)");
  } catch (err: any) {
    console.error("Failed to connect to RabbitMQ (rider service):", err.message);
    setTimeout(connectRabbitMQ, 5000);
  }
};

export const getChannel = () => channel;
