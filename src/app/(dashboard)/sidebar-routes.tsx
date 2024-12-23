"use client";

import {
  CreditCard,
  Crown,
  Home,
  MessageCircleQuestion,
  LayoutDashboard,
  Library,
} from "lucide-react";
import { usePathname } from "next/navigation";
import { HiOutlineTemplate } from "react-icons/hi";
import { usePaywall } from "@/features/subscriptions/hooks/use-paywall";
import { useBilling } from "@/features/subscriptions/api/use-billing";

import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";

import { SidebarItem } from "./sidebar-item";
import { FcTemplate } from "react-icons/fc";

export const SidebarRoutes = () => {
  const billingMutation = useBilling();
  const { shouldBlock, isLoading, triggerPaywall } = usePaywall();
  const pathname = usePathname();

  const onClick = () => {
    if (shouldBlock) {
      triggerPaywall();
      return;
    }
    billingMutation.mutate();
  };

  return (
    <div className="flex flex-col h-full justify-between">
      <div>
        {/* Section for Logo */}
        <div className="px-6 py-4">
          <div className="h-12 w-full bg-gray-200 rounded-lg flex items-center justify-center">
            {/* Replace with actual logo */}
            <span className="text-lg font-semibold text-gray-500">သင့်တံဆိပ်</span>
          </div>
        </div>

        <Separator className="mb-4" />

        {/* Main Navigation */}
        <ul className="flex flex-col gap-y-2 px-3">
          <SidebarItem
            href="/"
            icon={Home}
            label="မူလစာမျက်နှာ"
            isActive={pathname === "/"}
          />
          <SidebarItem
            href="/my-templates"
            icon={Library}
            label="ကျွန်ုပ်၏ ပုံစံများ"
            isActive={pathname === "/my-templates"}
          />
        </ul>

        <Separator className="my-4" />

        {/* Help Section */}
        <ul className="flex flex-col gap-y-2 px-3">
          <SidebarItem
            href="mailto:support@example.com"
            icon={MessageCircleQuestion}
            label="အကူအညီ ရယူရန်"
          />
        </ul>
      </div>

      {/* Upgrade Button */}
      {shouldBlock && !isLoading && (
        <div className="px-3 pb-4">
          <Button
            onClick={onClick}
            disabled={billingMutation.isPending}
            className="w-full rounded-xl border-none hover:bg-white hover:opacity-75 transition"
            variant="outline"
            size="lg"
          >
            <Crown className="mr-2 size-4 fill-yellow-500 text-yellow-500" />
            Pro ကို အဆင့်မြှင့်တင်ပါ
          </Button>
        </div>
      )}
    </div>
  );
};
