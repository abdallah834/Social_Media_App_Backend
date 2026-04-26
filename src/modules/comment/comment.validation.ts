import z from "zod";
import { fileFieldValidation } from "../../common/utils/multer";
import { generalValidationFields } from "./../../common/validation/general.validation";

export const createComment = {
  params: z.strictObject({
    postId: generalValidationFields.id,
  }),
  body: z
    .strictObject({
      content: z.string().optional(),
      files: z
        .array(generalValidationFields.file(fileFieldValidation.image))
        .optional(),
      tags: z.array(generalValidationFields.id).optional(),
    })
    .superRefine((args, ctx) => {
      if (!args.files?.length && !args.content) {
        ctx.addIssue({
          code: "custom",
          path: ["content"],
          message:
            "A comment needs to contain at least content or an attachment",
        });
      }
      if (args.tags?.length) {
        //Creating a set for unique keys
        const uniqueTags = [...new Set(args.tags)];
        if (uniqueTags.length !== args.tags.length) {
          ctx.addIssue({
            code: "custom",
            path: ["tags"],
            message: "A comment can't have duplicated tags",
          });
        }
        // for (const tag of args.tags) {
        //   if (!Types.ObjectId.isValid(tag)) {
        //     ctx.addIssue({
        //       code: "custom",
        //       path: ["tags"],
        //       message: "Invalid tagged user ID",
        //     });
        //   }
        // }
      }
    }),
};
export const commentReplies = {
  params: z.strictObject({
    postId: generalValidationFields.id,
    commentId: generalValidationFields.id,
  }),
  body: createComment.body,
};

// export const updatePost = {
//   params: z.strictObject({
//     postId: z.string(),
//   }),
//   body: z
//     .strictObject({
//       content: z.string().optional(),
//       files: z
//         .array(generalValidationFields.file(fileFieldValidation.image))
//         .optional(),
//       removeFiles: z.array(z.string()).optional(),
//       removeTags: z.array(generalValidationFields.id).optional(),
//       tags: z.array(generalValidationFields.id).optional(),
//       availability: z.coerce
//         .number()
//         .default(AvailabilityEnum.PUBLIC)
//         .optional(),
//     })
//     .superRefine((args, ctx) => {
//       const hasContent = !!args.content;
//       const hasFiles = !!args.files?.length;
//       const hasAnyField =
//         hasContent ||
//         hasFiles ||
//         !!args.removeFiles?.length ||
//         !!args.removeTags?.length ||
//         !!args.tags?.length ||
//         args.availability !== undefined;

//       if (!hasAnyField) {
//         ctx.addIssue({
//           code: "custom",
//           path: ["content"],
//           message: "No fields received.",
//         });
//         return;
//       }
//       if (args.content === "" || (args.files && args.files.length === 0)) {
//         if (!hasContent && !hasFiles) {
//           ctx.addIssue({
//             code: "custom",
//             path: ["content"],
//             message:
//               "A post needs to contain at least content or an attachment",
//           });
//         }
//       }

//       if (args.tags?.length) {
//         const uniqueTags = [...new Set(args.tags)];
//         if (uniqueTags.length !== args.tags.length) {
//           ctx.addIssue({
//             code: "custom",
//             path: ["tags"],
//             message: "A post can't have duplicated tags",
//           });
//         }
//       }
//     }),
// };
// export const reactPost = {
//   params: z.strictObject({
//     postId: generalValidationFields.id,
//   }),
//   query: z.strictObject({
//     react: z.coerce.number(),
//   }),
// };
