"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader, TriangleAlert, ClipboardCopy } from "lucide-react";

import { usePaywall } from "@/features/subscriptions/hooks/use-paywall";
import { ResponseType, useGetTemplates } from "@/features/projects/api/use-get-templates";
import { useCreateProject } from "@/features/projects/api/use-create-project";
import { useListCodes } from "@/features/subscriptions/hooks/useListCodes";

import { Dialog, DialogTitle, DialogFooter, DialogHeader, DialogContent } from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import { TemplateCard } from "./template-card";
import { useSession } from "next-auth/react";

export const TemplatesSection: React.FC = () => {
const session=useSession();
console.log(session,'sds');

  const { shouldBlock, triggerPaywall } = usePaywall();
  const router = useRouter();
  const mutation = useCreateProject();
  const [isCodeModalOpen, setIsCodeModalOpen] = useState<boolean>(false);
  const [codeInput, setCodeInput] = useState<string>("");
  const [selectedTemplate, setSelectedTemplate] = useState<ResponseType["data"][0] | null>(null);

  const { data, isLoading, isError } = useGetTemplates({ page: "1", limit: "4" });
  const { data: codesData, status: codesStatus, fetchNextPage, isFetchingNextPage, hasNextPage } = useListCodes();
console.log(codesData)
const handleModalSubmit = () => {
  if (!codeInput.trim()) {
    alert("Please enter a valid code");
    return;
  }

  if (!selectedTemplate) return;

  // Proceed with the mutation
  mutation.mutate(
    {
      name: `${selectedTemplate.name} project`,
      json: selectedTemplate.json,
      width: selectedTemplate.width,
      height: selectedTemplate.height,
      codeId: codeInput, // Pass the codeInput value here
    },
    {
      onSuccess: ({ data }) => {
        router.push(`/editor/${data.id}`);
      },
    }
  );
  setIsCodeModalOpen(false); // Close modal after submission
};


  const onClick = (template: ResponseType["data"][0]) => {
    if (template.isPro && shouldBlock) {
      triggerPaywall();
      return;
    }

    // Set the selected template and open the code modal
    setSelectedTemplate(template);
    setIsCodeModalOpen(true);
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <h3 className="font-semibold text-lg">
          Start from a template
        </h3>
        <div className="flex items-center justify-center h-32">
          <Loader className="size-6 text-muted-foreground animate-spin" />
        </div>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="space-y-4">
        <h3 className="font-semibold text-lg">
          Start from a template
        </h3>
        <div className="flex flex-col gap-y-4 items-center justify-center h-32">
          <TriangleAlert className="size-6 text-muted-foreground" />
          <p>
            Failed to load templates
          </p>
        </div>
      </div>
    );
  }

  if (!data?.length) {
    return null;
  }

  return (
    <div>
      <h3 className="font-semibold text-lg">
        Start from a template
      </h3>
      <div className="grid grid-cols-2 md:grid-cols-4 mt-4 gap-4">
        {data?.map((template) => (
          <TemplateCard
            key={template.id}
            title={template.name}
            imageSrc={template.thumbnailUrl || ""}
            onClick={() => onClick(template)}
            disabled={mutation.isPending}
            description={`${template.width} x ${template.height} px`}
            width={template.width}
            height={template.height}
            isPro={template.isPro}
          />
        ))}
      </div>

      {/* Modal for entering code */}
      <Dialog open={isCodeModalOpen} onOpenChange={(open) => setIsCodeModalOpen(open)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="text-center">Use Code</DialogTitle>
          </DialogHeader>
          <Separator />
          <div className="mt-4">
            <label htmlFor="code-input" className="block text-sm font-medium text-muted-foreground">
              Enter your code
            </label>
            <input
              id="code-input"
              type="text"
              value={codeInput}
              onChange={(e) => setCodeInput(e.target.value)}
              className="mt-2 w-full px-3 py-2 border rounded-md text-sm focus:outline-none focus:ring focus:ring-blue-500"
              placeholder="Enter code"
            />
          </div>
          <div className="mt-4">
            <h3 className="font-semibold text-lg">
              Your Codes
            </h3>
            {codesStatus === "pending" ? (
              <div className="flex items-center justify-center h-32">
                <Loader className="size-6 text-muted-foreground animate-spin" />
              </div>
            ) : codesStatus === "error" ? (
              <div className="flex items-center justify-center h-32">
                <TriangleAlert className="size-6 text-muted-foreground" />
                <p>
                  Failed to load codes
                </p>
              </div>
            ) : (
              codesData?.pages.map((page, pageIndex) => (
                <div key={pageIndex} className="grid grid-cols-2 gap-4 mt-2">
                  {page.data.map((code) => (
                    <CodeCard
                      key={code!.code!.id!}
                      code={code.code}
                      onClick={() => setCodeInput(code!.code!.id!)}
                    />
                  ))}
                </div>
              ))
            )}
            {hasNextPage && (
              <div className="w-full flex items-center justify-center pt-4">
                <Button
                  variant="ghost"
                  onClick={() => fetchNextPage()}
                  disabled={isFetchingNextPage}
                >
                  Load more
                </Button>
              </div>
            )}
          </div>
          <DialogFooter className="pt-2 mt-4 gap-y-2">
            <Button
              className="w-full"
              onClick={handleModalSubmit}
              disabled={mutation.isPending}
            >
              Submit Code
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

const CodeCard: React.FC<{ code: any; onClick: () => void }> = ({ code, onClick }) => {
  const copyToClipboard = () => {
    navigator.clipboard.writeText(code.id);
    alert("Code copied to clipboard");
  };

  return (
    <div onClick={onClick} className="cursor-pointer p-4 border rounded-md relative bg-gray-50 hover:bg-gray-100 transition-all">
      <div className="flex justify-between items-center">
        <h4 className="font-medium text-sm bg-blue-100 text-blue-800 p-1 rounded">{code.id}</h4>
        <ClipboardCopy 
          className="text-gray-500 hover:text-gray-700 cursor-pointer" 
          onClick={(e) => {
            e.stopPropagation();
            copyToClipboard();
          }} 
        />
      </div>
      <p className="mt-2 text-sm">Total {code.totalTemplates} templates and remaining {code.usedTemplates} templates</p>
    </div>
  );
};
