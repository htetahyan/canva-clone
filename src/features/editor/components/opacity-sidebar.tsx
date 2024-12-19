"use client";

import React, { useRef, useState, useEffect, useMemo } from "react";
import { CircleStencil, Cropper, CropperRef, RectangleStencil } from "react-advanced-cropper";
import "react-advanced-cropper/dist/style.css";
import { ActiveTool, Editor } from "@/features/editor/types";
import { ToolSidebarClose } from "@/features/editor/components/tool-sidebar-close";
import { ToolSidebarHeader } from "@/features/editor/components/tool-sidebar-header";
import { cn } from "@/lib/utils";
import { Slider } from "@/components/ui/slider";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogTitle,
  DialogFooter,
  DialogHeader,
  DialogContent,
  DialogDescription,
} from "@/components/ui/dialog";
import Image from "next/image";

interface OpacitySidebarProps {
  editor: Editor | undefined;
  activeTool: ActiveTool;
  onChangeActiveTool: (tool: ActiveTool) => void;
}

export const OpacitySidebar = ({
  editor,
  activeTool,
  onChangeActiveTool,
}: OpacitySidebarProps) => {
  const initialValue = editor?.getActiveOpacity() || 1;
  const selectedObject = useMemo(() => editor?.selectedObjects[0], [editor?.selectedObjects]);

  const [opacity, setOpacity] = useState(initialValue);
  const [stencil, setStencil] = useState<React.ElementType | null>(null);
  const [isCropModalOpen, setIsCropModalOpen] = useState(false);
  const [imageSrc, setImageSrc] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (selectedObject) {
      setOpacity(selectedObject.get("opacity") || 1);
      if (selectedObject.type === 'image') {
        setImageSrc((selectedObject as any).getSrc());
      }
    }
  }, [selectedObject]);

  const onClose = () => {
    onChangeActiveTool("select");
  };

  const onChange = (value: number) => {
    editor?.changeOpacity(value);
    setOpacity(value);
  };

  const handleCrop = (croppedImage: string) => {
    const activeObject = editor?.canvas.getActiveObject() as fabric.Image;
    if (activeObject && activeObject.type === 'image') {
    stencil===CircleStencil ?editor?.cropCircle(croppedImage) : editor?.handleCrop(croppedImage);
    }
    setIsLoading(false);
    setIsCropModalOpen(false);
  };

  return (
    <aside
      className={cn(
        "bg-white relative border-r z-[40] w-[360px] h-full flex flex-col",
        activeTool === "opacity" ? "visible" : "hidden"
      )}
    >
      <ToolSidebarHeader
        title="Opacity"
        description="Change the opacity of the selected object"
      />
      <ScrollArea>
        <div className="p-4 space-y-4 border-b">
          <Slider
            value={[opacity]}
            onValueChange={(values) => onChange(values[0])}
            max={1}
            min={0}
            step={0.01}
          />
          <Button
            className="w-full text-sm font-medium"
            onClick={() => {setIsCropModalOpen(true)
               setStencil(RectangleStencil)}}
          >
            Crop Image
          </Button>
          <Button
            className="w-full text-sm font-medium"
            onClick={() =>{ setIsCropModalOpen(true)
              setStencil(CircleStencil)
            }}
          >
            Crop Circle Shape
          </Button>
          {imageSrc && (
            <CropModal
              isOpen={isCropModalOpen}
              onClose={() => setIsCropModalOpen(false)}
              imageSrc={imageSrc}
              onCrop={handleCrop}
              stencil={stencil}
              isLoading={isLoading}
              setIsLoading={setIsLoading}
            />
          )}
        </div>
      </ScrollArea>
      <ToolSidebarClose onClick={onClose} />
    </aside>
  );
};

interface CropModalProps {
  isOpen: boolean;
  onClose: () => void;
  imageSrc: string;
  stencil: React.ElementType | null;
  onCrop: (croppedImage: string) => void;
  isLoading: boolean;
  setIsLoading: (isLoading: boolean) => void;
}

const CropModal: React.FC<CropModalProps> = ({
  isOpen,
  onClose,
  imageSrc,
  onCrop,
  stencil,
  isLoading,
  setIsLoading,
}) => {
  const cropperRef = useRef<CropperRef>(null);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader className="flex items-center space-y-4">
          <DialogTitle className="text-center">Crop Image</DialogTitle>
          <DialogDescription className="text-center">
            Adjust the cropping area and click crop to apply changes.
          </DialogDescription>
        </DialogHeader>
        {isLoading ? (
          <div className="flex justify-center items-center h-full">
            <div className="loader"></div>
          </div>
        ) : (
          <Cropper ref={cropperRef}
          stencilComponent={stencil}
          src={imageSrc} className="cropper" />
        )}
        <DialogFooter className="pt-2 mt-4 gap-y-2">
          <Button
            className="w-full"
            onClick={() => {
              setIsLoading(true);
              if (cropperRef.current) {
                ;
                const croppedImage = cropperRef!.current!.getCanvas()!.toDataURL();
                onCrop(croppedImage);
              }
            }}
          >
            Crop
          </Button>
          <Button className="w-full" onClick={onClose}>
            Cancel
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
