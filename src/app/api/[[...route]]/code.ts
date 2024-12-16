import { db } from "@/db/drizzle";
import { codes, codesAndUsers, users } from "@/db/schema";
import { verifyAuth } from "@hono/auth-js";
import { zValidator } from "@hono/zod-validator";
import { and, eq } from "drizzle-orm";
import { Hono } from "hono";
import { z } from "zod";

const app = new Hono()
.get(
  "/",
  verifyAuth(),
  zValidator(
    "query",
    z.object({
      page: z.coerce.number().default(1), // Default to page 1 if not provided
      limit: z.coerce.number().default(10), // Default to 10 items per page
    }),
  ),
  async (c) => {
    const auth = c.get("authUser");
    const { page, limit } = c.req.valid("query");

    if (!auth.token?.id) {
      return c.json({ error: "Unauthorized" }, 401);
    }

    // Query the database with pagination
    const myCodes = await db
      .select()
      .from(codesAndUsers)
      .where(eq(codesAndUsers.userId, auth.token.id as string))
      .leftJoin(codes, eq(codes.id, codesAndUsers.codeId))
      .limit(limit) // Apply the limit for pagination
      .offset((page - 1) * limit); // Apply the offset for pagination

    // Check if there is a next page
    const nextPage = myCodes.length === limit ? page + 1 : null;

    return c.json({
      data: myCodes,
      nextPage, // Send the nextPage to inform the client whether more data is available
    });
  }
)

.post("/:id", 
    verifyAuth(),
    zValidator("param", z.object({ id: z.string() })),
    async(c)=>{
        const auth = c.get("authUser");
        

        const { id } = c.req.valid("param");
        if (!auth.token?.id) {
            return c.json({ error: "Unauthorized" }, 401);
          }
          const code=await db.select().from(codes).where(eq(codes.id, id));

          if (code.length === 0) {
            return c.json({ error:" Not found" }, 404);
          }
          if(code[0].totalTemplates===code[0].usedTemplates){
            return c.json({ error:" Code limit reached" }, 404);
          }
          const existCodeAndUser=await db.select().from(codesAndUsers).where(
            and(
              eq(codesAndUsers.codeId, id as string),
              eq(codesAndUsers.userId, auth!.token!.id as string),
            )
          )

          if(existCodeAndUser.length>0){
            return c.json({ error:"you have already activated this code" }, 404);
          }
          await db.insert(codesAndUsers).values({
            codeId:id as string,
createdAt:new Date(),
            updatedAt:new Date(),
            userId:auth!.token!.id as string,
        })
          return c.json({ data: code[0] });

    })
export default app;