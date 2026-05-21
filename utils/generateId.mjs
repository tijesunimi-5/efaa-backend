/**
 * generateId.mjs
 * Generates deterministic, sequential node IDs for protocol nodes.
 * Also exports a random UUID fallback for other use cases.
 */

let counter = 0;

/**
 * Resets the counter — call this at the start of each parse run
 * so IDs are always consistent and start from node_1.
 */
export function resetIdCounter() {
  counter = 0;
}

/**
 * Returns the next sequential node ID: node_1, node_2, node_3 ...
 * @returns {string}
 */
export function generateNodeId() {
  counter += 1;
  return `node_${counter}`;
}

/**
 * Generates a simple random hex ID for non-sequential use cases.
 * @param {number} length - number of hex chars (default 8)
 * @returns {string}
 */
export function generateRandomId(length = 8) {
  return Math.random()
    .toString(16)
    .slice(2, 2 + length)
    .padEnd(length, "0");
}
