"use client";

import { useState } from "react";
import Image from "next/image";
import { CheckCircle2 } from "lucide-react";

import { useCheckout } from "@/features/subscriptions/api/use-checkout";
import { useSubscriptionModal } from "@/features/subscriptions/store/use-subscription-modal";

import {
  Dialog,
  DialogTitle,
  DialogFooter,
  DialogHeader,
  DialogContent,
  DialogDescription,
} from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";

export const SubscriptionModal = () => {
  const mutation = useCheckout();
  const { isOpen, onClose } = useSubscriptionModal();
  const [inputValue, setInputValue] = useState("");

  const handleUpgrade = () => {
    if (!inputValue.trim()) {
      alert("Please enter a valid input");
      return;
    }
    mutation.mutate(inputValue);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader className="flex items-center space-y-4">
          <Image src="/logo.svg" alt="Logo" width={36} height={36} />
          <DialogTitle className="text-center">
            Upgrade to a paid plan
          </DialogTitle>
          <DialogDescription className="text-center">
            insert code to use the service
          </DialogDescription>
        </DialogHeader>
        <Separator />
     
        <div className="mt-4">
          <label htmlFor="input" className="block text-sm font-medium text-muted-foreground">
            Enter  code
          </label>
          <input
            id="input"
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            className="mt-2 w-full px-3 py-2 border rounded-md text-sm focus:outline-none focus:ring focus:ring-blue-500"
            placeholder="Email or code"
          />
        </div>
        <DialogFooter className="pt-2 mt-4 gap-y-2">
          <Button
            className="w-full"
            onClick={handleUpgrade}
            disabled={mutation.isPending}
          >
            Upgrade
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
