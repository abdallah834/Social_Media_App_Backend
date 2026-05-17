import z from "zod";

export const sayHi = z.strictObject({
  name: z.string().min(2),
});
