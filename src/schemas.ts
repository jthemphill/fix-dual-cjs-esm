import { z } from "zod";

export const ConditionalExportSchema = z
  .object({
    types: z.string(),
    default: z.string(),
  })
  .or(z.string());

export const ExportSchema = z
  .object({
    types: z.string().optional(),
    module: ConditionalExportSchema.optional(),
    import: ConditionalExportSchema.optional(),
    require: ConditionalExportSchema.optional(),
  })
  .or(z.string());

export const PackageJsonSchema = z.object({
  // This only works on packages that default to ESM
  type: z.literal("module"),
  exports: z.record(ExportSchema),
});
