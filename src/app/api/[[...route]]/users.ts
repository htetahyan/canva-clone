import { z } from "zod";
import { Hono } from "hono";
import bcrypt from "bcryptjs";
import { asc, desc, eq } from "drizzle-orm";
import { zValidator } from "@hono/zod-validator";

import { db } from "@/db/drizzle";
import { users } from "@/db/schema";

const app = new Hono()
  .post(
    "/",
    zValidator(
      "json",
      z.object({
        username: z.string(),

        password: z.string().min(3).max(20),
      })
    ),
    
    async (c) => {
      const { username, password } = c.req.valid("json");

      const hashedPassword = await bcrypt.hash(password, 12);

      const query = await db
        .select()
        .from(users)
        .where(eq(users.username, username));

      if (query[0]) {
        return c.json({ error: "Email already in use" }, 400);
      }

      await db.insert(users).values({

        username,
        password: hashedPassword,
        
      });
      
      return c.json(null, 200);
    },
  ).get("/", 
    zValidator(
      "query",
      z.object({
          page: z.coerce.number(),
          limit: z.coerce.number(),
      }),
  ),
    async (c) => {
      const { page, limit } = c.req.valid("query");
      const data = await db.select().from(users).limit(limit).offset((page - 1) * limit).orderBy(desc(users.credits));
      return c.json({ data , nextPage: data.length === limit ? page + 1 : null });
    }
  ).patch(
    "/credits/:id",
    zValidator("param", z.object({ id: z.string() })), // Validate route parameter
    zValidator(
      "json",
      z.object({
        credits: z.coerce.number(), // Ensure `credits` is a number
      })
    ),
    async (c) => {
      const { id } = c.req.valid("param");
      const { credits } = c.req.valid("json");
  
      // Fetch the user from the database
      const user = await db.select().from(users).where(eq(users.id, id));
  
      if (user.length === 0) {
        // Return 404 if user not found
        return c.json({ error: "User not found" }, 404);
      }
  
      // Update the user's credits
      await db.update(users).set({ credits }).where(eq(users.id, id));
  
      // Respond with the updated user data
      return c.json({ data: { ...user[0], credits } });
    }
  );
  

export default app;
