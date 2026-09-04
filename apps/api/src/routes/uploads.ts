import { Elysia, t } from "elysia";
import { getUserFromRequest } from "../lib/session";
import { generatePresignedUpload } from "../lib/s3/presign";
import { validateImageType } from "../lib/s3/imageValidation";

export const uploadRoutes = new Elysia({ prefix: "/uploads" }).post(
  "/presign",
  async ({ request, body, set }) => {
    const user = await getUserFromRequest(request);
    if (!user) {
      set.status = 401;
      return { error: "Unauthorized" };
    }

    const typeCheck = validateImageType(body.contentType);
    if (!typeCheck.valid) {
      set.status = 400;
      return { error: typeCheck.error };
    }

    try {
      return await generatePresignedUpload({
        contentType: body.contentType,
        purpose: body.purpose,
        userId: user.id,
      });
    } catch (err) {
      console.error("[uploads] presign failed:", err);
      set.status = 500;
      return { error: err instanceof Error ? err.message : "Could not prepare upload" };
    }
  },
  {
    body: t.Object({
      contentType: t.String(),
      purpose: t.Union([t.Literal("avatar"), t.Literal("project")]),
    }),
  },
);
