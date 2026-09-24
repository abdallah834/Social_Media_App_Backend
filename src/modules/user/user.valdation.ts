import z from "zod";

export const profileGQLValidation = z.strictObject({
  search: z
    .string({ error: "Search must be a string" })
    .min(2, { error: "Search must contain at least 2 characters" })
    .optional(),
});
