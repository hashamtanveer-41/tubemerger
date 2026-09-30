/**
 * Ordered Map Interface (SOLID - Interface Segregation Principle)
 * Combines hash-map O(1) lookup with sequence-preserved iteration.
 */

export interface IOrderedMap<K, V> {
  set(key: K, value: V): void;
  get(key: K): V | undefined;
  has(key: K): boolean;
  delete(key: K): boolean;
  clear(): void;
  size(): number;
  keys(): K[];
  values(): V[];
  entries(): [K, V][];
}
