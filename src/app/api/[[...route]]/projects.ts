import { z } from "zod";
import { Hono } from "hono";
import { eq, and, desc, asc, sql } from "drizzle-orm";
import { verifyAuth } from "@hono/auth-js";
import { zValidator } from "@hono/zod-validator";

import { db } from "@/db/drizzle";
import { codes, codesAndUsers, projects, projectsInsertSchema, users } from "@/db/schema";

const app = new Hono()
  .get(
    "/templates",
    verifyAuth(),
    zValidator(
      "query",
      z.object({
        page: z.coerce.number(),
        limit: z.coerce.number(),
      }),
    ),
    async (c) => {
      const { page, limit } = c.req.valid("query");

      const data = await db
        .select()
        .from(projects)
        .where(eq(projects.isTemplate, true))
        .limit(limit)
        .offset((page -1) * limit)
        .orderBy(
          asc(projects.isPro),
          desc(projects.updatedAt),
        );

      return c.json({ data });
    },
  )
  .delete(
    "/:id",
    verifyAuth(),
    zValidator("param", z.object({ id: z.string() })),
    async (c) => {
      const auth = c.get("authUser");
      const { id } = c.req.valid("param");

      if (!auth.token?.id) {
        return c.json({ error: "Unauthorized" }, 401);
      }

      const data = await db
        .delete(projects)
        .where(
          and(
            eq(projects.id, id),
            eq(projects.userId, auth.token.id),
          ),
        )
        .returning();

      if (data.length === 0) {
        return c.json({ error: "Not found" }, 404);
      }

      return c.json({ data: { id } });
    },
  )
  .post(
    "/:id/duplicate",
    verifyAuth(),
    zValidator("param", z.object({ id: z.string() })),
    async (c) => {
      const auth = c.get("authUser");
      const { id } = c.req.valid("param");
      if (!auth.token?.id) {
        return c.json({ error: "Unauthorized" }, 401);
      }
      const user= await db.select().from(users).where(eq(users.id, auth.token.id!));

      const data = await db
        .select()
        .from(projects)
        .where(
          and(
            eq(projects.id, id),
            eq(projects.userId, auth.token.id),
          ),
        );

      if (data.length === 0) {
        return c.json({ error:" Not found" }, 404);
      }

      const project = data[0];
console.log(user[0])
      const duplicateData = await db
        .insert(projects)
        .values({
          name: `Copy of ${project.name}`,
          json: project.json,
          width: project.width,
          height: project.height,
          isTemplate: user[0].isAdmin,
          userId: auth.token.id,
          createdAt: new Date(),
          updatedAt: new Date(),
        })
        .returning();

      return c.json({ data: duplicateData[0] });
    },
  )
  .get(
    "/",
    verifyAuth(),
    zValidator(
      "query",
      z.object({
        page: z.coerce.number(),
        limit: z.coerce.number(),
      }),
    ),
    async (c) => {
      const auth = c.get("authUser");
      const { page, limit } = c.req.valid("query");

      if (!auth.token?.id) {
        return c.json({ error: "Unauthorized" }, 401);
      }

      const data = await db
        .select()
        .from(projects)
        .where(eq(projects.userId, auth.token.id))
        .limit(limit)
        .offset((page - 1) * limit)
        .orderBy(desc(projects.updatedAt))

      return c.json({
        data,
        nextPage: data.length === limit ? page + 1 : null,
      });
    },
  )
  .patch(
    "/:id",
    verifyAuth(),
    zValidator(
      "param",
      z.object({ id: z.string() }),
    ),
    zValidator(
      "json",
      projectsInsertSchema
        .omit({
          id: true,
          userId: true,
          createdAt: true,
          updatedAt: true,
        })
        .partial()
    ),
    async (c) => {
      const auth = c.get("authUser");
      const { id } = c.req.valid("param");
      const values = c.req.valid("json");

      if (!auth.token?.id) {
        return c.json({ error: "Unauthorized" }, 401);
      }

      const data = await db
        .update(projects)
        .set({
          ...values,
          updatedAt: new Date(),
        })
        .where(
          and(
            eq(projects.id, id),
            eq(projects.userId, auth.token.id),
          ),
        )
        .returning();

      if (data.length === 0) {
        return c.json({ error: "Unauthorized" }, 401);
      }

      return c.json({ data: data[0] });
    },
  )
  .get(
    "/:id",
    verifyAuth(),
    zValidator("param", z.object({ id: z.string() })),
    async (c) => {
      const auth = c.get("authUser");
      const { id } = c.req.valid("param");

      if (!auth.token?.id) {
        return c.json({ error: "Unauthorized" }, 401);
      }

      const data = await db
        .select()
        .from(projects)
        .where(
          and(
            eq(projects.id, id),
            eq(projects.userId, auth.token.id)
          )
        );

      if (data.length === 0) {
        return c.json({ error: "Not found" }, 404);
      }

      return c.json({ data: data[0] });
    },
  )
  .post(
    "/",
    verifyAuth(),
    zValidator(
      "json",
      projectsInsertSchema.pick({
        name: true,
        json: true,
        width: true,
        height: true,
        codeId: true
      }),
    ),
    async (c) => {
      const auth = c.get("authUser");
      const { name, json, height, width,codeId } = c.req.valid("json");
      console.log(auth);
      
      if (!auth.token?.id) {
        return c.json({ error: "Unauthorized" }, 401);
      } 
      const user=await db.select().from(users).where(eq(users.id, auth.token.id!))
console.log(user);
const codeAndUser=await db.select().from(codesAndUsers).where(
  and(
    eq(codesAndUsers.codeId, codeId as string),
    eq(codesAndUsers.userId, auth!.token!.id as string),
  )
) 


if(codeAndUser.length===0){
  return c.json({ error: "Cannot find this code in your account!" }, 500);
}
const code=await db.select().from(codes).where(eq(codes.id, codeId!))

if(code[0].totalTemplates===code[0].usedTemplates){
  return c.json({ error:" Code limit reached" }, 404);
}

    
        const data = await db
        .insert(projects)
        .values({
          name,
          json,
          width,
          height,
          codeId,
          isTemplate: user[0].isAdmin,
          userId: auth!.token!.id!,
          createdAt: new Date(),
          updatedAt: new Date(),
        })
        .returning();
        await db.update(codes) .set({
          usedTemplates: sql`${codes.usedTemplates} + 1`,
      

        }) 

      
  

      if (!data[0]) {
        return c.json({ error: "Something went wrong" }, 400);
      }

      return c.json({ data: data[0] });
    },
  );

export default app;
