'use client';
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader, TriangleAlert, ClipboardCopy } from "lucide-react";
import { usePaywall } from "@/features/subscriptions/hooks/use-paywall";
import { ResponseType, useGetTemplates } from "@/features/projects/api/use-get-templates";
import { useCreateProject } from "@/features/projects/api/use-create-project";
import { TemplateCard } from "./template-card";
import { useSession } from "next-auth/react";
import {
  Dialog,
  DialogTitle,
  DialogFooter,
  DialogHeader,
  DialogContent,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { X } from "lucide-react";

export const TemplatesSection: React.FC = () => {
  const session = useSession();
  console.log(session, 'sds');

  const { shouldBlock, triggerPaywall } = usePaywall();
  const router = useRouter();
  const mutation = useCreateProject();

  const [selectedTemplate, setSelectedTemplate] = useState<ResponseType["data"][0] | null>(null);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);

  const { data, isLoading, isError } = useGetTemplates({ page: "1", limit: "4" });

  const handlePreview = (template: ResponseType["data"][0]) => {
    setSelectedTemplate(template);
    setIsPreviewOpen(true);
  };

  const handleCreateProject = () => {
    if (selectedTemplate) {
      mutation.mutate(
        {
          name: `${selectedTemplate.name} project`,
          json: selectedTemplate.json,
          id: selectedTemplate.id,
          width: selectedTemplate.width,
          height: selectedTemplate.height,
        },
        {
          onSuccess: ({ data }) => {
            router.push(`/editor/${data.id}`);
          },
        }
      );
    }
    setIsPreviewOpen(false);
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <h3 className="font-semibold text-lg">ပုံစံတစ်ခုကိုရွေးပါ</h3>
        <div className="flex items-center justify-center h-32">
          <Loader className="size-6 text-muted-foreground animate-spin" />
        </div>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="space-y-4">
        <h3 className="font-semibold text-lg">ပုံစံတစ်ခုကိုရွေးပါ</h3>
        <div className="flex flex-col gap-y-4 items-center justify-center h-32">
          <TriangleAlert className="size-6 text-muted-foreground" />
          <p>ပုံစံများမရှိသေးပါ</p>
        </div>
      </div>
    );
  }

  if (!data?.length) {
    return null;
  }

  return (
    <div>
      <h3 className="font-semibold text-lg">ပုံစံတစ်ခုကိုရွေးချယ်၍ စတင်ပါ</h3>
      <div className="grid grid-cols-2 md:grid-cols-4 mt-4 gap-4">
        {data?.map((template) => (
          <TemplateCard
            key={template.id}
            title={template.name}
            imageSrc={template.thumbnailUrl || ""}
            onClick={() => handlePreview(template)}
            disabled={mutation.isPending}
            description={`${template.width} x ${template.height} px`}
            width={template.width}
            height={template.height}
            isPro={template.isPro}
          />
        ))}
      </div>

      {selectedTemplate && (
        <Dialog open={isPreviewOpen} onOpenChange={setIsPreviewOpen}>
          <DialogContent className="max-w-lg mx-auto bg-white rounded-lg shadow-lg p-6">
            <DialogHeader className="flex items-center justify-between">
              <div>
                <DialogTitle className="text-center">မည်သူမဆိုကြည့်ရှုနိုင်သည်</DialogTitle>
                <DialogDescription className="text-center text-sm text-muted-foreground">
                  ပရောဂျက်တစ်ခုကိုဖန်တီးရန် မည်သူမဆိုကြည့်ရှုနိုင်ပါသည်။
                </DialogDescription>
              </div>
              <Button
                variant="ghost"
                className="text-muted-foreground p-1"
                onClick={() => setIsPreviewOpen(false)}
              >
                <X size={16} />
              </Button>
            </DialogHeader>

            <div className="p-4 text-center">
              <img src={selectedTemplate.thumbnailUrl || ""} alt={selectedTemplate.name} className="mx-auto rounded-md" />
            </div>

            <div className="p-4 text-center">
              {selectedTemplate.isCurrentUserOwner ? (
                <p className="text-sm text-green-600">ဤပုံစံကို သင့်အနေဖြင့်ပိုင်ဆိုင်ထားပါသည်။</p>
              ) : (
                <p className="text-sm text-red-600">ဤပုံစံသည် ကရက်ဒစ်တစ်ခုကုန်ကျမည်</p>
              )}
            </div>

            <DialogFooter className="pt-2 mt-4 flex gap-4">
              <Button
                className="w-full"
                onClick={handleCreateProject}
                disabled={mutation.isPending}
              >
                ပရောဂျက်ဖန်တီးပါ
              </Button>
              <Button
                className="w-full"
                variant="outline"
                onClick={() => setIsPreviewOpen(false)}
              >
                ရွေးချယ်မှုပယ်ဖျက်ပါ
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
};
