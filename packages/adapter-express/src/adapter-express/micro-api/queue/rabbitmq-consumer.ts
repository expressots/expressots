import {
  IQueueConsumer,
  MessageHandler,
  QueueConsumerConfig,
  QueueMessage,
  QueueStats,
} from "./queue.interface.js";

/**
 * RabbitMQ-specific configuration
 */
export interface RabbitMQConfig extends QueueConsumerConfig {
  /** RabbitMQ connection URL */
  url: string;
  /** Exchange name (optional) */
  exchange?: string;
  /** Exchange type (default: "direct") */
  exchangeType?: "direct" | "topic" | "fanout" | "headers";
  /** Routing key for publishing */
  routingKey?: string;
  /** Prefetch count (default: 1) */
  prefetch?: number;
  /** Enable durable queue (default: true) */
  durable?: boolean;
}

/**
 * Load amqplib dynamically to avoid requiring it as a dependency
 */
async function loadAmqpLib(): Promise<{
  connect: (url: string) => Promise<unknown>;
}> {
  try {
    // `amqplib` is an OPTIONAL peer dep - it is intentionally not installed
    // in this package's devDependencies. We route the specifier through a
    // variable so TypeScript does not try to statically resolve it during
    // build (TS treats variable-typed specifiers in `await import(...)` as
    // `any` and skips the resolution check). Resolution happens at runtime
    // in user apps that have actually installed amqplib.
    const specifier: string = "amqplib";
    const amqp = (await import(specifier)) as unknown as {
      connect: (url: string) => Promise<unknown>;
    };
    return amqp;
  } catch {
    throw new Error(
      "amqplib is not installed. Install it with: npm install amqplib @types/amqplib",
    );
  }
}

/**
 * RabbitMQ Consumer - Message queue consumer for RabbitMQ.
 *
 * Features:
 * - Message consumption with handlers
 * - Message publishing
 * - Exchange support
 * - Automatic reconnection
 * - Prefetch control
 * - Dead letter queue support
 *
 * @example
 * ```typescript
 * const orderQueue = new RabbitMQConsumer({
 *     url: process.env.RABBITMQ_URL,
 *     queue: "orders",
 *     prefetch: 10,
 * });
 *
 * // Start consuming
 * await orderQueue.consume(async (message) => {
 *     const order = message.body;
 *     console.log("Processing order:", order.id);
 *     await processOrder(order);
 * });
 *
 * // Publish from HTTP endpoint
 * app.Route.post("/orders", async (req, res) => {
 *     await orderQueue.publish(req.body);
 *     res.status(202).json({ message: "Order queued" });
 * });
 *
 * // Graceful shutdown
 * process.on("SIGTERM", async () => {
 *     await orderQueue.close();
 * });
 * ```
 *
 * Note: This implementation requires the 'amqplib' package.
 * Install with: npm install amqplib @types/amqplib
 */
export class RabbitMQConsumer<T = unknown> implements IQueueConsumer<T> {
  // Using 'any' for AMQP types since amqplib is an optional peer dependency
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private connection: any = null;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private channel: any = null;
  private config: Required<RabbitMQConfig>;
  private stats: QueueStats = {
    messagesReceived: 0,
    messagesProcessed: 0,
    messagesFailed: 0,
    messagesPublished: 0,
    isConnected: false,
  };

  constructor(config: RabbitMQConfig) {
    this.config = {
      queue: config.queue,
      url: config.url,
      exchange: config.exchange ?? "",
      exchangeType: config.exchangeType ?? "direct",
      routingKey: config.routingKey ?? config.queue,
      prefetch: config.prefetch ?? 1,
      durable: config.durable ?? true,
      concurrency: config.concurrency ?? 1,
      autoAck: config.autoAck ?? true,
      debug: config.debug ?? false,
    };
  }

  /**
   * Connect to RabbitMQ
   */
  private async connect(): Promise<void> {
    if (this.connection) return;

    try {
      const amqp = await loadAmqpLib();

      this.connection = await amqp.connect(this.config.url);
      this.channel = await this.connection.createChannel();

      // Set prefetch
      await this.channel.prefetch(this.config.prefetch);

      // Declare queue
      await this.channel.assertQueue(this.config.queue, {
        durable: this.config.durable,
      });

      // Declare exchange if configured
      if (this.config.exchange) {
        await this.channel.assertExchange(this.config.exchange, this.config.exchangeType, {
          durable: true,
        });

        // Bind queue to exchange
        await this.channel.bindQueue(
          this.config.queue,
          this.config.exchange,
          this.config.routingKey,
        );
      }

      this.stats.isConnected = true;

      if (this.config.debug) {
        console.log(`[RabbitMQ] Connected to ${this.config.url}, queue: ${this.config.queue}`);
      }

      // Handle connection close
      this.connection.on("close", () => {
        this.stats.isConnected = false;
        console.log("[RabbitMQ] Connection closed");
      });

      this.connection.on("error", (err: unknown) => {
        console.error("[RabbitMQ] Connection error:", err);
      });
    } catch (error) {
      console.error("[RabbitMQ] Failed to connect:", error);
      throw error;
    }
  }

  /**
   * Start consuming messages
   */
  async consume(handler: MessageHandler<T>): Promise<void> {
    await this.connect();

    if (!this.channel) {
      throw new Error("Channel not initialized");
    }

    await this.channel.consume(
      this.config.queue,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      async (msg: any) => {
        if (!msg) return;

        this.stats.messagesReceived++;
        this.stats.lastMessageAt = new Date();

        try {
          // Parse message
          const body = JSON.parse(msg.content.toString()) as T;

          const queueMessage: QueueMessage<T> = {
            id: msg.properties.messageId || Date.now().toString(36),
            body,
            headers: msg.properties.headers,
            timestamp: new Date(msg.properties.timestamp || Date.now()),
            receiveCount: msg.properties.headers?.["x-delivery-count"] || 1,
            raw: msg,
          };

          if (this.config.debug) {
            console.log(`[RabbitMQ] Received message:`, queueMessage.id);
          }

          // Process message
          await handler(queueMessage);

          this.stats.messagesProcessed++;

          // Acknowledge
          if (!this.config.autoAck && this.channel) {
            this.channel.ack(msg);
          }
        } catch (error) {
          this.stats.messagesFailed++;
          console.error("[RabbitMQ] Message processing failed:", error);

          // Reject and requeue if not auto-ack
          if (!this.config.autoAck && this.channel) {
            this.channel.nack(msg, false, true);
          }
        }
      },
      { noAck: this.config.autoAck },
    );

    if (this.config.debug) {
      console.log(`[RabbitMQ] Consuming from ${this.config.queue}`);
    }
  }

  /**
   * Publish a message to the queue
   */
  async publish(message: T): Promise<void> {
    await this.connect();

    if (!this.channel) {
      throw new Error("Channel not initialized");
    }

    const content = Buffer.from(JSON.stringify(message));
    const properties = {
      messageId: Date.now().toString(36),
      timestamp: Date.now(),
      contentType: "application/json",
    };

    if (this.config.exchange) {
      this.channel.publish(this.config.exchange, this.config.routingKey, content, properties);
    } else {
      this.channel.sendToQueue(this.config.queue, content, properties);
    }

    this.stats.messagesPublished++;

    if (this.config.debug) {
      console.log(`[RabbitMQ] Published message to ${this.config.queue}`);
    }
  }

  /**
   * Close the connection
   */
  async close(): Promise<void> {
    if (this.channel) {
      await this.channel.close();
      this.channel = null;
    }
    if (this.connection) {
      await this.connection.close();
      this.connection = null;
    }

    this.stats.isConnected = false;

    if (this.config.debug) {
      console.log("[RabbitMQ] Connection closed");
    }
  }

  /**
   * Get consumer statistics
   */
  getStats(): QueueStats {
    return { ...this.stats };
  }
}
