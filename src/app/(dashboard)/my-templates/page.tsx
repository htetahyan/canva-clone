import React from "react";
import { TemplatesSection } from "../templates-section";

const Page: React.FC = () => {
  return (
    <div className="container mx-auto px-4">
      <header className="py-6 text-center">
        <h1 className="text-2xl font-bold">ပုံစံ ရွေးချယ်ခြင်း</h1>
        <p className="text-muted-foreground mt-2">
          သင့်ပရောဂျက်ကို စတင်ရန် ကျွမ်းကျင်စွာ တီထွင်ထားသော ပုံစံများမှ ရွေးချယ်ပါ။
        </p>
      </header>
      <TemplatesSection />
    </div>
  );
};

export default Page;
