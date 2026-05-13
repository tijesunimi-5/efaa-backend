import { z } from "zod";

export const ProtocolSchema = z.object({
  title: z.string().min(1),
  category: z.string().optional(),
  nodes: z.array(
    z.object({
      id: z.string(),
      type: z.enum(["question", "guide"]),
      text: z.string().optional(),
      title: z.string().optional(),
      options: z
        .array(
          z.object({
            label: z.string(),
            next: z.string(),
          }),
        )
        .optional(),
      steps: z
        .array(
          z.object({
            text: z.string(),
            voice: z.string().optional(),
            autoNext: z.number().default(0),
          }),
        )
        .optional(),
    }),
  ),
  // AI-generated confidence is just a hint; our service calculates real confidence.
  ai_confidence: z.number().min(0).max(1).optional(),
});
