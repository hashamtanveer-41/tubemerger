/**
 * Generic Queue Interface (SOLID - Interface Segregation Principle)
 */

export interface IQueue<T> {
  enqueue(item: T): void;
  dequeue(): T | undefined;
  peek(): T | undefined;
  isEmpty(): boolean;
  size(): number;
  clear(): void;
  toArray(): T[];
}

export interface IDeque<T> extends IQueue<T> {
  enqueueFront(item: T): void;
  dequeueBack(): T | undefined;
  peekBack(): T | undefined;
}
