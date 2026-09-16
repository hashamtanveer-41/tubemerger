/**
 * Backward compatibility re-export facade for @/services/api.
 *
 * All domain endpoint implementations are partitioned under ./api/.
 */

export * from './api/index';
export { api as default } from './api/index';
