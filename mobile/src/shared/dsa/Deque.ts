/**
 * High-Performance Double-Ended Queue (Deque)
 * Provides O(1) time complexity for insertions and deletions at both ends.
 * Avoids Array.shift() which incurs O(N) memory copy overhead.
 */

import { IDeque } from './IQueue';

export class Deque<T> implements IDeque<T> {
  private items: Record<number, T> = {};
  private head: number = 0;
  private tail: number = 0;

  constructor(initialItems?: T[]) {
    if (initialItems && initialItems.length > 0) {
      for (const item of initialItems) {
        this.enqueue(item);
      }
    }
  }

  enqueue(item: T): void {
    this.items[this.tail] = item;
    this.tail++;
  }

  enqueueFront(item: T): void {
    this.head--;
    this.items[this.head] = item;
  }

  dequeue(): T | undefined {
    if (this.isEmpty()) {
      return undefined;
    }
    const item = this.items[this.head];
    delete this.items[this.head];
    this.head++;
    this.normalizeIfNeeded();
    return item;
  }

  dequeueBack(): T | undefined {
    if (this.isEmpty()) {
      return undefined;
    }
    this.tail--;
    const item = this.items[this.tail];
    delete this.items[this.tail];
    this.normalizeIfNeeded();
    return item;
  }

  peek(): T | undefined {
    if (this.isEmpty()) {
      return undefined;
    }
    return this.items[this.head];
  }

  peekBack(): T | undefined {
    if (this.isEmpty()) {
      return undefined;
    }
    return this.items[this.tail - 1];
  }

  isEmpty(): boolean {
    return this.size() === 0;
  }

  size(): number {
    return this.tail - this.head;
  }

  clear(): void {
    this.items = {};
    this.head = 0;
    this.tail = 0;
  }

  toArray(): T[] {
    const result: T[] = [];
    for (let i = this.head; i < this.tail; i++) {
      result.push(this.items[i]);
    }
    return result;
  }

  private normalizeIfNeeded(): void {
    if (this.head === this.tail) {
      this.head = 0;
      this.tail = 0;
    }
  }
}
