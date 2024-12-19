"use client"; 

import React, { useRef, useState, useEffect } from 'react';
import { fabric } from 'fabric';
import * as pdfjsLib from 'pdfjs-dist';

pdfjsLib.GlobalWorkerOptions.workerSrc = `/pdf.worker.min.mjs`;

const PdfToFabric: React.FC = () => {
    const canvasRef = useRef<HTMLCanvasElement | null>(null);
    const [fabricCanvas, setFabricCanvas] = useState<fabric.Canvas | null>(null);
    const [pageInfo, setPageInfo] = useState<any>(null);
    const [editingEnabled, setEditingEnabled] = useState(false);

    // Convert file to ArrayBuffer
    const getArrayBuffer = (blob: Blob): Promise<ArrayBuffer> => {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result as ArrayBuffer);
            reader.onerror = reject;
            reader.readAsArrayBuffer(blob);
        });
    };

    // Render PDF page to Fabric canvas
    const renderPdfPage = async (page: pdfjsLib.PDFPageProxy, canvas: fabric.Canvas) => {
        const scale = 2.0;
        const viewport = page.getViewport({ scale });

        // Set canvas dimensions
        canvas.setWidth(viewport.width);
        canvas.setHeight(viewport.height);
        if (canvasRef.current) {
            canvasRef.current.width = viewport.width;
            canvasRef.current.height = viewport.height;
        }

        // Render page to offscreen canvas
        const pageCanvas = document.createElement('canvas');
        const context = pageCanvas.getContext('2d')!;
        pageCanvas.width = viewport.width;
        pageCanvas.height = viewport.height;

        await page.render({ canvasContext: context, viewport }).promise;

        // Render text, vector graphics, and annotations
        await renderTextContent(page, canvas, viewport);
        const hasVectorGraphics = await detectVectorGraphics(page);
        if (hasVectorGraphics) {
            await renderVectorGraphics(page, canvas, viewport);
        }
        const annotations = await page.getAnnotations();
        await renderAnnotations(annotations, canvas);

        // Enable editing
        canvas.isDrawingMode = false;
        canvas.selection = true;
        canvas.forEachObject((obj) => {
            obj.selectable = true;
            obj.hasControls = true;
        });
        setEditingEnabled(true);
    };

    // Detect presence of vector graphics in the PDF page
    const detectVectorGraphics = async (page: pdfjsLib.PDFPageProxy): Promise<boolean> => {
        const ops = await page.getOperatorList();
        let hasVectorGraphics = false;

        for (let i = 0; i < ops.fnArray.length; i++) {
            const opCode = ops.fnArray[i];
            const opArgs = ops.argsArray[i];

            switch (opCode) {
                case pdfjsLib.OPS.constructPath:
                case pdfjsLib.OPS.rectangle:
                
                    break;
            }

            if (hasVectorGraphics) {
                break;
            }
        }

        return hasVectorGraphics;
    };

    // Render text content
    const renderTextContent = async (
        page: pdfjsLib.PDFPageProxy, 
        canvas: fabric.Canvas, 
        viewport: pdfjsLib.PageViewport
    ) => {
        try {
            const textContent = await page.getTextContent();
            
            textContent.items.forEach((textItem: any) => {
                const { transform, str } = textItem;
                const [scaleX, skewX, skewY, scaleY, translateX, translateY] = transform;

                // Calculate text properties
                const fontSize = Math.sqrt(scaleX * scaleX + skewY * skewY);
                const rotation = Math.atan2(skewX, scaleX) * (180 / Math.PI);

                // Transform coordinates
                const left = translateX;
                const top = viewport.height - translateY;

                // Create Fabric text object
                const fabricText = new fabric.Text(str, {
                    left,
                    top,
                    fontSize,
                    angle: rotation,
                    fill: 'black',
                    selectable: true,
                });

                canvas.add(fabricText);
            });
        } catch (error) {
            console.error('Error rendering text:', error);
        }
    };

    // Render vector graphics
    const renderVectorGraphics = async (
        page: pdfjsLib.PDFPageProxy, 
        canvas: fabric.Canvas, 
        viewport: pdfjsLib.PageViewport
    ) => {
        try {
            // Use SVG graphics rendering
            //@ts-ignore
            const svgGfx = new pdfjsLib.SVGGraphics(page.commonObjs, page.objs);
            const operatorList = await page.getOperatorList();
            const svg = await svgGfx.getSVG(operatorList, viewport);

            // Parse SVG and convert to Fabric objects
            const parser = new DOMParser();
            const svgDoc = parser.parseFromString(svg.outerHTML, 'image/svg+xml');
            
            // Select and convert various SVG elements
            const svgElements = svgDoc.querySelectorAll('path, rect, circle, ellipse, line, polyline, polygon');
            
            svgElements.forEach((element: Element) => {
                let fabricObj: fabric.Object | null = null;

                switch (element.tagName.toLowerCase()) {
                    case 'path':
                        const pathData = element.getAttribute('d');
                        if (pathData) {
                            fabricObj = new fabric.Path(pathData, {
                                fill: element.getAttribute('fill') || 'transparent',
                                stroke: element.getAttribute('stroke') || 'black',
                                strokeWidth: parseFloat(element.getAttribute('stroke-width') || '1'),
                                selectable: true,
                            });
                        }
                        break;

                    case 'rect':
                        fabricObj = new fabric.Rect({
                            left: parseFloat(element.getAttribute('x') || '0'),
                            top: parseFloat(element.getAttribute('y') || '0'),
                            width: parseFloat(element.getAttribute('width') || '0'),
                            height: parseFloat(element.getAttribute('height') || '0'),
                            fill: element.getAttribute('fill') || 'transparent',
                            stroke: element.getAttribute('stroke') || 'black',
                            strokeWidth: parseFloat(element.getAttribute('stroke-width') || '1'),
                            selectable: true,
                        });
                        break;

                    case 'circle':
                        fabricObj = new fabric.Circle({
                            left: parseFloat(element.getAttribute('cx') || '0') - parseFloat(element.getAttribute('r') || '0'),
                            top: parseFloat(element.getAttribute('cy') || '0') - parseFloat(element.getAttribute('r') || '0'),
                            radius: parseFloat(element.getAttribute('r') || '0'),
                            fill: element.getAttribute('fill') || 'transparent',
                            stroke: element.getAttribute('stroke') || 'black',
                            strokeWidth: parseFloat(element.getAttribute('stroke-width') || '1'),
                            selectable: true,
                        });
                        break;
                    
                    // Add more shape conversions as needed
                }

                if (fabricObj) {
                    canvas.add(fabricObj);
                }
            });
        } catch (error) {
            console.error('Error rendering vector graphics:', error);
        }
    };

    // Render annotations
    const renderAnnotations = (annotations: any[], canvas: fabric.Canvas) => {
        annotations.forEach((annotation) => {
            const { rect, url, subtype } = annotation;

            if (subtype === "Link" && url) {
                const [x1, y1, x2, y2] = rect;
                const width = x2 - x1;
                const height = y2 - y1;

                // Create a Fabric rectangle for the link
                const linkRect = new fabric.Rect({
                    left: x1,
                    top: y1,
                    width,
                    height,
                    fill: "rgba(0, 0, 255, 0.2)", // Semi-transparent blue for visual indication
                    selectable: false,
                    evented: true,
                    hoverCursor: "pointer",
                });

                // Add event for clicking the link
                linkRect.on("mousedown", () => {
                    window.open(url, "_blank");
                });

                canvas.add(linkRect);
            }
        });
    };

    // Handle file input
    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file || !canvasRef.current) return;

        try {
            // Convert file to ArrayBuffer
            const arrayBuffer = await getArrayBuffer(file);
            const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;

            // Initialize or reset Fabric canvas
            if (fabricCanvas) fabricCanvas.dispose();
            const canvas = new fabric.Canvas(canvasRef.current);
            setFabricCanvas(canvas);

            // Render first page
            const page = await pdf.getPage(1);
            await renderPdfPage(page, canvas);

            // Store page information
            setPageInfo({
                totalPages: pdf.numPages,
                pageSize: page.getViewport({ scale: 1 })
            });
        } catch (error) {
            console.error('Error rendering PDF:', error);
        }
    };

    // Cleanup effect
    useEffect(() => {
        return () => {
            if (fabricCanvas) {
                fabricCanvas.dispose();
            }
        };
    }, [fabricCanvas]);

    return (
        <div style={{ width: '100%', overflow: 'auto' }}>
            <h1>Editable PDF Renderer</h1>
            <input 
                type="file" 
                accept=".pdf" 
                onChange={handleFileChange} 
                style={{ marginBottom: '10px' }} 
            />
            {editingEnabled && (
                <button onClick={() => setEditingEnabled(false)}>
                    Disable Editing
                </button>
            )}
            <div style={{ 
                border: '1px solid black', 
                maxWidth: '100%', 
                overflow: 'auto' 
            }}>
                <canvas ref={canvasRef}></canvas>
            </div>
            {pageInfo && (
                <div>
                    <p>Total Pages: {pageInfo.totalPages}</p>
                    <p>Page Size: {pageInfo.pageSize.width} x {pageInfo.pageSize.height}</p>
                </div>
            )}
        </div>
    );
};

export default PdfToFabric;
