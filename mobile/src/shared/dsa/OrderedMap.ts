/**
 * OrderedMap Data Structure
 * Guarantees O(1) key lookups while preserving clip insertion order.
 */

import { IOrderedMap } from './IOrderedMap';

export class OrderedMap<K, V> implements IOrderedMap<K, V> {
  private map: Map<K, V> = new Map();

  constructor(entries?: [K, V][]) {
    if (entries) {
      for (const [key, value] of entries) {
        this.set(key, value);
      }
    }
  }

  set(key: K, value: V): void {
    if (this.map.has(key)) {
      this.map.delete(key);
    }
    this.map.set(key, value);
  }

  get(key: K): V | undefined {
    return this.map.get(key);
  }

  has(key: K): boolean {
    return this.map.has(key);
  }

  delete(key: K): boolean {
    return this.map.delete(key);
  }

  clear(): void {
    this.map.clear();
  }

  size(): number {
    return this.map.size;
  }

  keys(): K[] {
    return Array.from(this.map.keys());
  }

  values(): V[] {
    return Array.from(this.map.values());
  }

  entries(): [K, V][] {
    return Array.from(this.map.entries());
  }
}
