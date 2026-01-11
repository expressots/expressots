/**
 * Message format for queue consumers
 */
export interface QueueMessage<T = unknown> {
  /** Unique message ID */
  id: string;
  /** Message body */
  body: T;
  /** Message headers/attributes */
  headers?: Record<string, string>;
  /** Timestamp when message was published */
  timestamp: Date;
  /** Number of times message has been received */
  receiveCount?: number;
  /** Original raw message */
  raw?: unknown;
}

/**
 * Handler function for processing queue messages
 */
export type MessageHandler<T = unknown> = (message: QueueMessage<T>) => Promise<void>;

/**
 * Base configuration for queue consumers
 */
export interface QueueConsumerConfig {
  /** Queue/topic name */
  queue: string;
  /** Connection URL */
  url?: string;
  /** Number of concurrent message handlers (default: 1) */
  concurrency?: number;
  /** Auto-acknowledge messages (default: true) */
  autoAck?: boolean;
  /** Enable debug logging (default: false) */
  debug?: boolean;
}

/**
 * Queue consumer interface
 */
export interface IQueueConsumer<T = unknown> {
  /** Start consuming messages */
  consume(handler: MessageHandler<T>): Promise<void>;
  /** Publish a message to the queue */
  publish(message: T): Promise<void>;
  /** Stop consuming and close connection */
  close(): Promise<void>;
  /** Get consumer stats */
  getStats(): QueueStats;
}

/**
 * Queue statistics
 */
export interface QueueStats {
  messagesReceived: number;
  messagesProcessed: number;
  messagesFailed: number;
  messagesPublished: number;
  isConnected: boolean;
  lastMessageAt?: Date;
}
