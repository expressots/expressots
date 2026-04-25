/**
 * Queue Integration for ExpressoTS Micro Template
 */

export {
  type QueueMessage,
  type MessageHandler,
  type QueueConsumerConfig,
  type IQueueConsumer,
  type QueueStats,
} from "./queue.interface.js";

export { RabbitMQConsumer, type RabbitMQConfig } from "./rabbitmq-consumer.js";
