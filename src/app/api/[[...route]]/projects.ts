import { z } from "zod";
import { Hono } from "hono";
import { eq, and, desc, asc, sql } from "drizzle-orm";
import { verifyAuth } from "@hono/auth-js";
import { zValidator } from "@hono/zod-validator";

import { db } from "@/db/drizzle";
import { projects, projectsInsertSchema, templatesAndUsers, users } from "@/db/schema";

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
                .offset((page - 1) * limit)
                .orderBy(
                    asc(projects.isPro),
                    desc(projects.updatedAt)
                );
        
            const userId = c.get("authUser")?.token?.id;
            if (!userId) {
                return c.json({ error: "Unauthorized" }, 401);
            }
        
            const isCurrentUserOwner = async (projectId: string) => {
                const data = await db
                    .select()
                    .from(templatesAndUsers)
                    .where(and(eq(templatesAndUsers.userId, userId), eq(templatesAndUsers.templateId, projectId)));
                return data.length > 0;
            };
        
            const newData = await Promise.all(data.map(async (item) => {
                const isOwner = await isCurrentUserOwner(item.id);
                return {
                    ...item,
                    isCurrentUserOwner: isOwner
                };
            }));
        
            console.log(data, newData);
        
            return c.json({ data: newData });
        }
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

            const duplicateData = await db
                .insert(projects)
                .values({
                    name: `Copy of ${project.name}`,
                    json: project.json,
                    width: project.width,
                    height: project.height,
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
    ) //change name
    .patch(
        "/:id/name",
        verifyAuth(),
        zValidator(
            "param",
            z.object({ id: z.string() }),
        ),
        zValidator(
            "json",
            z.object({
                name: z.string().min(1, "Name cannot be empty").optional(),
            }),
        ),
        async (c) => {
            const auth = c.get("authUser");
            const { id } = c.req.valid("param");
            const { name } = c.req.valid("json");

            if (!auth?.token?.id) {
                return c.json({ error: "Unauthorized" }, 401);
            }

            if (!name) {
                return c.json({ error: "No valid fields to update" }, 400);
            }

            const data = await db
                .update(projects)
                .set({
                    name,
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
                return c.json({ error: "Project not found or unauthorized" }, 404);
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
               id: true,
                json: true,
                width: true,
                height: true,
            }),
        ),
        async (c) => {
            const auth = c.get("authUser");
            const { name, json, height, width,id } = c.req.valid("json");
const user= await db.select().from(users).where(eq(users.id, auth!.token!.id!))

            if (!auth.token?.id) {
                return c.json({ error: "Unauthorized" }, 401);
            }

            if(user[0].isAdmin && id){
                return c.json({ error: "u can't edit template here" }, 401);
            }
            const templateAndUser=await db.select().from(templatesAndUsers).where(and(eq(templatesAndUsers.templateId,id!),eq(templatesAndUsers.userId,auth!.token!.id!)))

            if(!templateAndUser.length && id){
                if(user[0].credits===0){
                    return c.json({ error: "You don't have enough credits" }, 401);
                }
                await db.update(users).set({credits:sql`${users.credits} - 1`}).where(eq(users.id,auth!.token!.id!))
            await db.insert(templatesAndUsers).values({userId:auth!.token!.id!,templateId:id!})
            }

            const data = await db
                .insert(projects)
                .values({
                    name,
                    json,
                    width,
                    height,
                    isTemplate:user[0].isAdmin?true:false,
                    userId: auth.token.id,
                    createdAt: new Date(),
                    updatedAt: new Date(),
                })
                .returning();

            if (!data[0]) {
                return c.json({ error: "Something went wrong" }, 400);
            }

            return c.json({ data: data[0] });
        },
    );

export default app;