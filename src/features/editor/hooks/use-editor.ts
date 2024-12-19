import { fabric } from "fabric";
import { useCallback, useState, useMemo, useRef } from "react";

import { 
  Editor, 
  FILL_COLOR,
  ECLIPSE_OPTIONS,
  STROKE_WIDTH,
  STROKE_COLOR,
  CIRCLE_OPTIONS,
  DIAMOND_OPTIONS,
  TRIANGLE_OPTIONS,
  BuildEditorProps, 
  RECTANGLE_OPTIONS,
  EditorHookProps,
  LINE_OPTIONS,
  STROKE_DASH_ARRAY,
  TEXT_OPTIONS,
  FONT_FAMILY,
  FONT_WEIGHT,
  FONT_SIZE,
  JSON_KEYS,
  DASHLINE_OPTIONS,
} from "@/features/editor/types";
import { useHistory } from "@/features/editor/hooks/use-history";
import { 
  createFilter, 
  downloadFile, 
  isTextType,
  transformText
} from "@/features/editor/utils";
import { useHotkeys } from "@/features/editor/hooks/use-hotkeys";
import { useClipboard } from "@/features/editor/hooks//use-clipboard";
import { useAutoResize } from "@/features/editor/hooks/use-auto-resize";
import { useCanvasEvents } from "@/features/editor/hooks/use-canvas-events";
import { useWindowEvents } from "@/features/editor/hooks/use-window-events";
import { useLoadState } from "@/features/editor/hooks/use-load-state";

const buildEditor = ({
  save,
  undo,
  redo,
  canRedo,
  canUndo,
  autoZoom,
  copy,
  paste,
  canvas,
  fillColor,
  fontFamily,
  setFontFamily,
  setFillColor,
  strokeColor,
  setStrokeColor,
  strokeWidth,
  setStrokeWidth,
  selectedObjects,
  strokeDashArray,
  setStrokeDashArray,
}: BuildEditorProps): Editor => {
  const generateSaveOptions = () => {
    const { width, height, left, top } = getWorkspace() as fabric.Rect;

    return {
      name: "Image",
      format: "png",
      quality: 1,
      width,
      height,
      left,
      top,
    };
  };

  const savePng = () => {
    const options = generateSaveOptions();

    canvas.setViewportTransform([1, 0, 0, 1, 0, 0]);
    const dataUrl = canvas.toDataURL(options);

    downloadFile(dataUrl, "png");
    autoZoom();
  };

  const saveSvg = () => {
    const options = generateSaveOptions();

    canvas.setViewportTransform([1, 0, 0, 1, 0, 0]);
    const dataUrl = canvas.toDataURL(options);

    downloadFile(dataUrl, "svg");
    autoZoom();
  };

  const saveJpg = () => {
    const options = generateSaveOptions();

    canvas.setViewportTransform([1, 0, 0, 1, 0, 0]);
    const dataUrl = canvas.toDataURL(options);

    downloadFile(dataUrl, "jpg");
    autoZoom();
  };

  const saveJson = async () => {
    const dataUrl = canvas.toJSON(JSON_KEYS);

    await transformText(dataUrl.objects);
    const fileString = `data:text/json;charset=utf-8,${encodeURIComponent(
      JSON.stringify(dataUrl, null, "\t"),
    )}`;
    downloadFile(fileString, "json");
  };


  const loadJson = (json: string) => {
    const data = JSON.parse(json);

    canvas.loadFromJSON(data, () => {
      autoZoom();

    });
  };

  const getWorkspace = () => {
    return canvas
    .getObjects()
    .find((object) => object.name === "clip");
  };

  const center = (object: fabric.Object) => {
    const workspace = getWorkspace();
    const center = workspace?.getCenterPoint();

    if (!center) return;

    // @ts-ignore
    canvas._centerObject(object, center);
  };

  const addToCanvas = (object: fabric.Object) => {
    center(object);
    canvas.add(object);
    canvas.setActiveObject(object);
  };

  return {
    savePng,
    saveJpg,
    saveSvg,
    saveJson,
    loadJson,
    lockObject: () => {
      canvas.getActiveObjects().forEach((object) => {
        object.selectable = false;
      });
      save();
    },
    canUndo,
    canRedo,
    autoZoom,
    getWorkspace,
    zoomIn: () => {
      let zoomRatio = canvas.getZoom();
      zoomRatio += 0.05;
      const center = canvas.getCenter();
      canvas.zoomToPoint(
        new fabric.Point(center.left, center.top),
        zoomRatio > 1 ? 1 : zoomRatio
      );
    },
    zoomOut: () => {
      let zoomRatio = canvas.getZoom();
      zoomRatio -= 0.05;
      const center = canvas.getCenter();
      canvas.zoomToPoint(
        new fabric.Point(center.left, center.top),
        zoomRatio < 0.2 ? 0.2 : zoomRatio,
      );
    },
    lockSelection: () => {
      canvas.getActiveObjects().forEach((object) => {
        object.selectable = false;
      });

      canvas.discardActiveObject();
      canvas.renderAll();
      save();
    },
    changeSize: (value: { width: number; height: number }) => {
      const workspace = getWorkspace();

      workspace?.set(value);
      autoZoom();
      save();
    },
    changeBackground: (value: string) => {
      const workspace = getWorkspace();
      workspace?.set({ fill: value });
      canvas.renderAll();
      save();
    },
    enableDrawingMode: () => {
      canvas.discardActiveObject();
      canvas.renderAll();
      canvas.isDrawingMode = true;
      canvas.freeDrawingBrush.width = strokeWidth;
      canvas.freeDrawingBrush.color = strokeColor;
    },
    disableDrawingMode: () => {
      canvas.isDrawingMode = false;
    },
    onUndo: () => undo(),
    onRedo: () => redo(),
    onCopy: () => copy(),
    onPaste: () => paste(),
    changeImageFilter: (value: string) => {
      const objects = canvas.getActiveObjects();
      objects.forEach((object) => {
        if (object.type === "image") {
          const imageObject = object as fabric.Image;

          const effect = createFilter(value);

          imageObject.filters = effect ? [effect] : [];
          imageObject.applyFilters();
          canvas.renderAll();
        }
      });
    },
    changeImageToCircle : () => {
      const objects = canvas.getActiveObjects();
      objects.forEach((object) => {
        if (object.type === "image") {
          const imageObject = object as fabric.Image;
    
          // Get the dimensions of the image (width and height)
          const width = imageObject.width! * imageObject.scaleX!;
          const height = imageObject.height! * imageObject.scaleY!;
          
          // Calculate radius for the circle (use the smaller dimension for a perfect circle)
          const radius = Math.min(width, height) / 2;
    
          // Create a circular clip path for the image
          const circleClipPath = new fabric.Circle({
            radius: radius,
            originX: "center",
            originY: "center",
           
            left: width / 2,
            top: height / 2,
          });
    
          // Set the clip path to the image
          imageObject.clipPath = circleClipPath;
    
          // Refresh the canvas to show the update
          canvas.requestRenderAll();
        }
      });
    },
    
    addImage: (value: string) => {
      fabric.Image.fromURL(
        value,
        (image) => {
          const workspace = getWorkspace();

          image.scaleToWidth(workspace?.width || 0);
          image.scaleToHeight(workspace?.height || 0);

          addToCanvas(image);
        },
        {
          crossOrigin: "anonymous",
        },
      );
    },
    
    replaceImage: (value: string) => {
      { const activeObject = canvas.getActiveObject();
         if (!activeObject) { console.error("No active object to replace"); return; } 
         const oldProperties = { left: activeObject.left, top: activeObject.top, angle: activeObject.angle, scaleX: activeObject.scaleX, scaleY: activeObject.scaleY, flipX: activeObject.flipX, flipY: activeObject.flipY, originX: activeObject.originX, originY: activeObject.originY, };
          fabric.Image.fromURL( value, (image) => { const workspace = getWorkspace(); 
            image.scaleToWidth(workspace?.width || 0); image.scaleToHeight(workspace?.height || 0); // Set new image properties to match the old one 
            image.set(oldProperties); // Remove old image and add the new one 
       canvas.remove(activeObject); addToCanvas(image); }, { crossOrigin: "anonymous",}
         )}
    
      
    },
      handleCrop : (croppedImage: string) => {
       
          const activeObject = canvas.getActiveObject() as fabric.Image;
          if (activeObject && activeObject.type === 'image') {
            console.log("Cropped Image Data URL:", croppedImage);
            activeObject.setSrc(croppedImage);
            canvas.renderAll();
            console.log("Image source updated and canvas re-rendered");
            save();
          
      }},
      cropCircle: (croppedImage: string) => {
        const activeObject = canvas.getActiveObject() as fabric.Image;
        if (activeObject && activeObject.type === 'image') {
          const { width, height, scaleY, scaleX, top, left } = activeObject!;
          const image = new Image();
          console.log("Cropped Image Data URL:", croppedImage);
          const svgMask=new fabric.Circle({
            radius: activeObject!.width!/2,
            originX: "center",
            originY: "center",
            strokeWidth: 0,
           
            left: 0,
            top: 0,
            strokeLineJoin: 'bevel',
          })
          svgMask.scaleToWidth(scaleX! * width!);
    svgMask.scaleToHeight(scaleY! * height!);
    image.src = croppedImage;
    image.onload = function() {
      const img = new fabric.Image(image);

      img.set({
        originX: 'center',
        originY: 'center',
        flipX: false,
        flipY: false,
        filters: activeObject.filters,
      });
      img.scaleToWidth(scaleX! * width!);
      img.scaleToHeight(scaleY! * height!);
      img.applyFilters();
      img.setCoords();
        
      const group = new fabric.Group([img], {
        clipPath: svgMask,

        top,
        left,
       
      });
      group.scaleToWidth(scaleX! * width!);
      group.scaleToHeight(scaleY! * height!);

      canvas.remove(activeObject);
      group.center().setCoords();
      canvas.add(group);
          canvas.renderAll();
          console.log("Image source updated and canvas re-rendered");
          save();
        }
      }},
      
    editImage: (value: string) => {
      const activeObject = canvas.getActiveObject();
      if (!activeObject) {
        console.error("No active object to edit");
        return;
      }
      if (activeObject.type === "image") {
        const imageObject = activeObject as fabric.Image;
        imageObject.setSrc(value);
        canvas.renderAll();
      }
      save();
    },
    delete: () => {
      canvas.getActiveObjects().forEach((object) => canvas.remove(object));
      canvas.discardActiveObject();
      canvas.renderAll();
    },
    addText: (value, options) => {
      const object = new fabric.Textbox(value, {
        ...TEXT_OPTIONS,
        fill: fillColor,
        ...options,
      });

      addToCanvas(object);
    },
    getActiveOpacity: () => {
      const selectedObject = selectedObjects[0];

      if (!selectedObject) {
        return 1;
      }

      const value = selectedObject.get("opacity") || 1;

      return value;
    },
    changeFontSize: (value: number) => {
      canvas.getActiveObjects().forEach((object) => {
        if (isTextType(object.type)) {
          // @ts-ignore
          // Faulty TS library, fontSize exists.
          object.set({ fontSize: value });
        }
      });
      canvas.renderAll();
    },
    getActiveFontSize: () => {
      const selectedObject = selectedObjects[0];

      if (!selectedObject) {
        return FONT_SIZE;
      }

      // @ts-ignore
      // Faulty TS library, fontSize exists.
      const value = selectedObject.get("fontSize") || FONT_SIZE;

      return value;
    },
      changeTextAlign: (value: string) => {
        canvas.getActiveObjects().forEach((object) => {
          if (isTextType(object.type)) {
            // @ts-ignore
            // Faulty TS library, textAlign exists.
            object.set({ textAlign: value });
          }
        });
        canvas.renderAll();
      },
     changeBulletList:(value:boolean)=>{
      canvas.getActiveObjects().forEach((object) => {
        if (isTextType(object.type)) {
          // @ts-ignore
          // Faulty TS library, textAlign exists.
          object.set({ shadow: value });
        }
        
      })
      canvas.renderAll();

     } ,  getActiveBulletList: () => {
      const selectedObject = selectedObjects[0];

      if (!selectedObject) {
        return false;
      }

      // @ts-ignore
      // Faulty TS library, textAlign exists.
      const value = selectedObject.get("list") || false;

      return value as boolean;
     }
     ,
     getActiveTextAlign: () => {
        const selectedObject = selectedObjects[0];

        if (!selectedObject) {
          return "left";
        }

        // @ts-ignore
        // Faulty TS library, textAlign exists.
        const value = selectedObject.get("textAlign") || "left";

        return value;
      },
      changeFontUnderline: (value: boolean) => {
        canvas.getActiveObjects().forEach((object) => {
          if (isTextType(object.type)) {
            // @ts-ignore
            // Faulty TS library, underline exists.
            object.set({ underline: value });
          }
        });
        canvas.renderAll();
      },
    getActiveFontUnderline: () => {
      const selectedObject = selectedObjects[0];

      if (!selectedObject) {
        return false;
      }

      // @ts-ignore
      // Faulty TS library, underline exists.
      const value = selectedObject.get("underline") || false;

      return value;
    },
    changeFontLinethrough: (value: boolean) => {
      canvas.getActiveObjects().forEach((object) => {
        if (isTextType(object.type)) {
          // @ts-ignore
          // Faulty TS library, linethrough exists.
          object.set({ linethrough: value });
        }
      });
      canvas.renderAll();
    },
    getActiveFontLinethrough: () => {
      const selectedObject = selectedObjects[0];

      if (!selectedObject) {
        return false;
      }

      // @ts-ignore
      // Faulty TS library, linethrough exists.
      const value = selectedObject.get("linethrough") || false;

      return value;
    },
    changeFontStyle: (value: string) => {
      canvas.getActiveObjects().forEach((object) => {
        if (isTextType(object.type)) {
          // @ts-ignore
          // Faulty TS library, fontStyle exists.
          object.set({ fontStyle: value });
        }
      });
      canvas.renderAll();
    },
    getActiveFontStyle: () => {
      const selectedObject = selectedObjects[0];

      if (!selectedObject) {
        return "normal";
      }

      // @ts-ignore
      // Faulty TS library, fontStyle exists.
      const value = selectedObject.get("fontStyle") || "normal";

      return value;
    },
    changeFontWeight: (value: number) => {
      canvas.getActiveObjects().forEach((object) => {
        if (isTextType(object.type)) {
          // @ts-ignore
          // Faulty TS library, fontWeight exists.
          object.set({ fontWeight: value });
        }
      });
      canvas.renderAll();
    },
    changeOpacity: (value: number) => {
      canvas.getActiveObjects().forEach((object) => {
        object.set({ opacity: value });
      });
      canvas.renderAll();
    },
    bringForward: () => {
      canvas.getActiveObjects().forEach((object) => {
        canvas.bringForward(object);
      });

      canvas.renderAll();
      
      const workspace = getWorkspace();
      workspace?.sendToBack();
    },
     group : () => {
      const activeObjects = canvas.getActiveObjects();
    
      if (activeObjects.length > 1) { // Ensure there are multiple objects to group
        // Deselect individual objects
        canvas.discardActiveObject();
    
        // Create a group from selected objects
        const group = new fabric.Group(activeObjects, {
          selectable: true,
          evented: true,
        });
    
        // Remove individual objects and add the group to canvas
        activeObjects.forEach((object) => canvas.remove(object));
        canvas.add(group);
    
        // Set the group as the active selection
        canvas.setActiveObject(group);
        canvas.requestRenderAll();
      }
    },
    
     unGroup :() => {
      const activeObject = canvas.getActiveObject();
    
      if (activeObject && activeObject.type === 'group') {
         // Check if it's a group
         //@ts-ignore
        const objects = activeObject.getObjects();
    
        // Ungroup: Add individual objects back to canvas
          //@ts-ignore
        activeObject._objects.forEach((object) => {
          canvas.add(object);
        });
    
        // Remove the group from the canvas
        canvas.remove(activeObject);
        canvas.discardActiveObject();
    
        // Re-render the canvas
        canvas.requestRenderAll();
      }
    },    
   
    sendBackwards: () => {
      canvas.getActiveObjects().forEach((object) => {
        canvas.sendBackwards(object);
      });

      canvas.renderAll();
      const workspace = getWorkspace();
      workspace?.sendToBack();
    },
    changeFontFamily: (value: string) => {
      setFontFamily(value);
      canvas.getActiveObjects().forEach((object) => {
        if (isTextType(object.type)) {
          // @ts-ignore
          // Faulty TS library, fontFamily exists.
          object.set({ fontFamily: value });
        }
      });
      canvas.renderAll();
    },
    changeFillColor: (value: string) => {
      setFillColor(value);
      canvas.getActiveObjects().forEach((object) => {
        object.set({ fill: value });
      });
      canvas.renderAll();
    },
    changeStrokeColor: (value: string) => {
      setStrokeColor(value);
      canvas.getActiveObjects().forEach((object) => {
        // Text types don't have stroke
        if (isTextType(object.type)) {
          object.set({ fill: value });
          return;
        }

        object.set({ stroke: value });
      });
      canvas.freeDrawingBrush.color = value;
      canvas.renderAll();
    },
    changeStrokeWidth: (value: number) => {
      setStrokeWidth(value);
      canvas.getActiveObjects().forEach((object) => {
        object.set({ strokeWidth: value });
      });
      canvas.freeDrawingBrush.width = value;
      canvas.renderAll();
    },
    changeStrokeDashArray: (value: number[]) => {
      setStrokeDashArray(value);
      canvas.getActiveObjects().forEach((object) => {
        object.set({ strokeDashArray: value });
      });
      canvas.renderAll();
    },
    addCircle: () => {
      const object = new fabric.Circle({
        ...CIRCLE_OPTIONS,
        fill: fillColor,
        stroke: strokeColor,
        strokeWidth: strokeWidth,
        strokeDashArray: strokeDashArray,
      });

      addToCanvas(object);
    },
   addEclipse: () => {
     const object = new fabric.Ellipse({
       ...ECLIPSE_OPTIONS,
       fill: fillColor,
       stroke: strokeColor,
       strokeWidth: strokeWidth,
       strokeDashArray: strokeDashArray,
     });
  
     addToCanvas(object);
   },
   cropImage: () => {
     const activeObject = canvas.getActiveObject();
  
     if (activeObject && activeObject.type === 'image') {
       // @ts-ignore
       activeObject.cropToCanvas();
     }
  
     canvas.renderAll();
   },
   
    addSoftRectangle: () => {
      const object = new fabric.Rect({
        ...RECTANGLE_OPTIONS,
        rx: 50,
        ry: 50,
        fill: fillColor,
        stroke: strokeColor,
        strokeWidth: strokeWidth,
        strokeDashArray: strokeDashArray,
      });

      addToCanvas(object);
    },
    addRectangle: () => {
      const object = new fabric.Rect({
        ...RECTANGLE_OPTIONS,
        fill: fillColor,
        stroke: strokeColor,
        strokeWidth: strokeWidth,
        strokeDashArray: strokeDashArray,
      });

      addToCanvas(object);
    },
    addTriangle: () => {
      const object = new fabric.Triangle({
        ...TRIANGLE_OPTIONS,
        fill: fillColor,
        stroke: strokeColor,
        strokeWidth: strokeWidth,
        strokeDashArray: strokeDashArray,
      });

      addToCanvas(object);
    },
    addInverseTriangle: () => {
      const HEIGHT = TRIANGLE_OPTIONS.height;
      const WIDTH = TRIANGLE_OPTIONS.width;

      const object = new fabric.Polygon(
        [
          { x: 0, y: 0 },
          { x: WIDTH, y: 0 },
          { x: WIDTH / 2, y: HEIGHT },
        ],
        {
          ...TRIANGLE_OPTIONS,
          fill: fillColor,
          stroke: strokeColor,
          strokeWidth: strokeWidth,
          strokeDashArray: strokeDashArray,
        }
      );

      addToCanvas(object);
    },
    addDiamond: () => {
      const HEIGHT = DIAMOND_OPTIONS.height;
      const WIDTH = DIAMOND_OPTIONS.width;

      const object = new fabric.Polygon(
        [
          { x: WIDTH / 2, y: 0 },
          { x: WIDTH, y: HEIGHT / 2 },
          { x: WIDTH / 2, y: HEIGHT },
          { x: 0, y: HEIGHT / 2 },
        ],
        {
          ...DIAMOND_OPTIONS,
          fill: fillColor,
          stroke: strokeColor,
          strokeWidth: strokeWidth,
          strokeDashArray: strokeDashArray,
        }
      );
      addToCanvas(object);
    },
    addLine: () => {
      const { left, top, width, stroke, strokeWidth, strokeDashArray } = LINE_OPTIONS;
    
      const object = new fabric.Line([left, top, left + width, top], {
        stroke: stroke,
        strokeWidth: strokeWidth,
        strokeDashArray: strokeDashArray, // Optional: add dashes if needed
      });
    
      addToCanvas(object);
    }
    
,     
addDashedLine: () => {
  const { left, top, width, stroke, strokeWidth, strokeDashArray } = DASHLINE_OPTIONS;

  const object = new fabric.Line([left, top, left + width, top], {
    stroke: stroke,
    strokeWidth: strokeWidth,
    strokeDashArray: strokeDashArray, // Dashed effect
  });

  addToCanvas(object);
}
,
    canvas,
    getActiveFontWeight: () => {
      const selectedObject = selectedObjects[0];

      if (!selectedObject) {
        return FONT_WEIGHT;
      }

      // @ts-ignore
      // Faulty TS library, fontWeight exists.
      const value = selectedObject.get("fontWeight") || FONT_WEIGHT;

      return value;
    },
    getActiveFontFamily: () => {
      const selectedObject = selectedObjects[0];

      if (!selectedObject) {
        return fontFamily;
      }

      // @ts-ignore
      // Faulty TS library, fontFamily exists.
      const value = selectedObject.get("fontFamily") || fontFamily;

      return value;
    },
    getActiveFillColor: () => {
      const selectedObject = selectedObjects[0];

      if (!selectedObject) {
        return fillColor;
      }

      const value = selectedObject.get("fill") || fillColor;

      // Currently, gradients & patterns are not supported
      return value as string;
    },
    getActiveStrokeColor: () => {
      const selectedObject = selectedObjects[0];

      if (!selectedObject) {
        return strokeColor;
      }

      const value = selectedObject.get("stroke") || strokeColor;

      return value;
    },
    getActiveStrokeWidth: () => {
      const selectedObject = selectedObjects[0];

      if (!selectedObject) {
        return strokeWidth;
      }

      const value = selectedObject.get("strokeWidth") || strokeWidth;

      return value;
    },
    getActiveStrokeDashArray: () => {
      const selectedObject = selectedObjects[0];

      if (!selectedObject) {
        return strokeDashArray;
      }

      const value = selectedObject.get("strokeDashArray") || strokeDashArray;

      return value;
    },
    selectedObjects,
  };
};

export const useEditor = ({
  defaultState,
  defaultHeight,
  defaultWidth,
  clearSelectionCallback,
  saveCallback,
}: EditorHookProps) => {
  const initialState = useRef(defaultState);
  const initialWidth = useRef(defaultWidth);
  const initialHeight = useRef(defaultHeight);

  const [canvas, setCanvas] = useState<fabric.Canvas | null>(null);
  const [container, setContainer] = useState<HTMLDivElement | null>(null);
  const [selectedObjects, setSelectedObjects] = useState<fabric.Object[]>([]);

  const [fontFamily, setFontFamily] = useState(FONT_FAMILY);
  const [fillColor, setFillColor] = useState(FILL_COLOR);
  const [strokeColor, setStrokeColor] = useState(STROKE_COLOR);
  const [strokeWidth, setStrokeWidth] = useState(STROKE_WIDTH);
  const [strokeDashArray, setStrokeDashArray] = useState<number[]>(STROKE_DASH_ARRAY);

  useWindowEvents();

  const { 
    save, 
    canRedo, 
    canUndo, 
    undo, 
    redo,
    canvasHistory,
    setHistoryIndex,
  } = useHistory({ 
    canvas,
    saveCallback
  });

  const { copy, paste } = useClipboard({ canvas });

  const { autoZoom } = useAutoResize({
    canvas,
    container,
  });

  useCanvasEvents({
    save,
    canvas,
    setSelectedObjects,
    clearSelectionCallback,
  });

  useHotkeys({
    undo,
    redo,
    copy,
    paste,
    save,
    canvas,
  });

  useLoadState({
    canvas,
    autoZoom,
    initialState,
    canvasHistory,
    setHistoryIndex,
  });

  const editor = useMemo(() => {
    if (canvas) {
      return buildEditor({
        save,
        undo,
        redo,
        canUndo,

        canRedo,
        autoZoom,
        copy,
        paste,
        canvas,
        fillColor,
        strokeWidth,
        strokeColor,
        setFillColor,
        setStrokeColor,
        setStrokeWidth,
        strokeDashArray,
        selectedObjects,
        setStrokeDashArray,
        fontFamily,
        setFontFamily,
      });
    }

    return undefined;
  }, 
  [
    canRedo,
    canUndo,
    undo,
    redo,
    save,
    autoZoom,
    copy,
    paste,
    canvas,
    fillColor,
    strokeWidth,
    strokeColor,
    selectedObjects,
    strokeDashArray,
    fontFamily,
  ]);

  const init = useCallback(
    ({
      initialCanvas,
      initialContainer,
    }: {
      initialCanvas: fabric.Canvas;
      initialContainer: HTMLDivElement;
    }) => {
      fabric.Object.prototype.set({
        cornerColor: "#FFF",
        cornerStyle: "circle",
        borderColor: "#3b82f6",
        borderScaleFactor: 1.5,
        transparentCorners: false,
        borderOpacityWhenMoving: 1,
        cornerStrokeColor: "#3b82f6",
      });

      const initialWorkspace = new fabric.Rect({
        width: initialWidth.current,
        height: initialHeight.current,
        name: "clip",
        fill: "white",
        selectable: false,
        hasControls: false,
        shadow: new fabric.Shadow({
          color: "rgba(0,0,0,0.8)",
          blur: 5,
        }),
      });

      initialCanvas.setWidth(initialContainer.offsetWidth);
      initialCanvas.setHeight(initialContainer.offsetHeight);

      initialCanvas.add(initialWorkspace);
      initialCanvas.centerObject(initialWorkspace);
      initialCanvas.clipPath = initialWorkspace;

      setCanvas(initialCanvas);
      setContainer(initialContainer);

      const currentState = JSON.stringify(
        initialCanvas.toJSON(JSON_KEYS)
      );
      canvasHistory.current = [currentState];
      setHistoryIndex(0);
    },
    [
      canvasHistory, // No need, this is from useRef
      setHistoryIndex, // No need, this is from useState
    ]
  );

  return { init, editor };
};
