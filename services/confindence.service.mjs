/**
 * SAFETY CHECK:
 * Calculates how much we trust the AI output based on logical structure.
 */
export const calculateConfidence = (data) => {
  let score = 1.0;

  if (!data.title || data.title.length < 3) score -= 0.3;
  if (data.nodes.length === 0) score -= 0.5;

  data.nodes.forEach((node) => {
    if (
      node.type === "question" &&
      (!node.options || node.options.length < 2)
    ) {
      score -= 0.1; // Questions should usually have options
    }
    if (node.type === "guide" && (!node.steps || node.steps.length === 0)) {
      score -= 0.1; // Guides should have steps
    }
  });

  return Math.max(0, score);
};
