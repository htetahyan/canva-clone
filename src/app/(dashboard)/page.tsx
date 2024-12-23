import { protectServer } from "@/features/auth/utils";

import { Banner } from "./banner";
import { ProjectsSection } from "./projects-section";
import { TemplatesSection } from "./templates-section";
import { auth } from "@/auth";
import { db } from "@/db/drizzle";
import { users } from "@/db/schema";
import { eq } from "drizzle-orm";

export default async function Home() {
  await protectServer();
const a= await auth();

const user= await db.select().from(users).where(eq(users.id, a!.user!.id!))

  return (
    <div className="flex flex-col space-y-6 max-w-screen-xl mx-auto pb-10">
    {  user[0]?.isAdmin && <Banner />}
      <TemplatesSection />
      <ProjectsSection />
    </div>
  );
};

