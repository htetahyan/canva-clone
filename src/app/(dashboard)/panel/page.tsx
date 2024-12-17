'use client';

import React, { useRef, useState, useEffect } from 'react';
import { fabric } from 'fabric';
import * as pdfjsLib from 'pdfjs-dist';

pdfjsLib.GlobalWorkerOptions.workerSrc = `/pdf.worker.min.mjs`;

const PdfToFabric: React.FC = () => {
    const canvasRef = useRef<HTMLCanvasElement | null>(null);
    const [fabricCanvas, setFabricCanvas] = useState<fabric.Canvas | null>(null);

    // Convert Blob to ArrayBuffer for pdf.js
    const getArrayBuffer = (blob: Blob): Promise<ArrayBuffer> => {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result as ArrayBuffer);
            reader.onerror = reject;
            reader.readAsArrayBuffer(blob);
        });
    };

    // Cleanup Fabric.js canvas on unmount
    useEffect(() => {
        return () => {
            if (fabricCanvas) {
                fabricCanvas.dispose();
            }
        };
    }, [fabricCanvas]);

    // Render a single PDF page to Fabric.js canvas
    const renderPage = async (page: any, canvas: fabric.Canvas) => {
        // Scale the viewport to 1.5 (adjust as needed for clarity)
        const scale = 1;
        const viewport = page.getViewport({ scale });

        // Match Fabric canvas dimensions to the PDF page
        const { width, height } = viewport;
        canvas.setWidth(width);
        canvas.setHeight(height);

        // Resize the actual DOM <canvas> element
        if (canvasRef.current) {
            canvasRef.current.width = width;
            canvasRef.current.height = height;
        }

        // Render PDF page to an intermediate canvas
        const pdfCanvas = document.createElement('canvas');
        const context = pdfCanvas.getContext('2d')!;
        pdfCanvas.width = width;
        pdfCanvas.height = height;

        await page.render({ canvasContext: context, viewport }).promise;

        // Convert the rendered PDF to a data URL and set as background
        const imgData = pdfCanvas.toDataURL();

        const img = new fabric.Image(imgData, {
            left: 0,
            top: 0,
            selectable: false,
        });

        canvas.setBackgroundImage(img, canvas.renderAll.bind(canvas));

        // Extract and render text content
        const textContent = await page.getTextContent();
const p=await page
        console.log(textContent,p)
        textContent.items.forEach((item: any) => {
            const { str, transform } = item;
            const [a, b, c, d, e, f] = transform; // PDF transformation matrix

            // Calculate font size
            const fontSize = Math.hypot(a, b);

            // Adjust Y-coordinate to flip vertically
            const left = e; // X-coordinate (remains the same)
            const top = height - f; // Flip Y-axis based on PDF height

            // Add text to Fabric.js canvas
            const text = new fabric.Text(str, {
                left,
                top,
                fontSize,
                fill: 'black',
                fontFamily: 'Helvetica',
                selectable: true,
                originX: 'left',
                originY: 'top',
            });

            canvas.add(text);
        });
    };

    // Handle file input change
    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file || !canvasRef.current) return;

        try {
            const arrayBuffer = await getArrayBuffer(file);
            const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;

            // Initialize Fabric.js canvas (reset if already exists)
            if (fabricCanvas) fabricCanvas.dispose();
            const canvas = new fabric.Canvas(canvasRef.current);
            setFabricCanvas(canvas);

            // Render the first page of the PDF
            const page = await pdf.getPage(1);
            await renderPage(page, canvas);
        } catch (error) {
            console.error('Error rendering PDF:', error);
        }
    };

    return (
        <div style={{ width: '100%', overflow: 'auto' }}>
            <h1>PDF to Fabric.js Canvas</h1>
            <input
                type="file"
                accept="application/pdf"
                onChange={handleFileChange}
                style={{ marginBottom: '10px' }}
            />
            <br />
            <div style={{ border: '1px solid black', maxWidth: '100%', overflow: 'auto' }}>
                <canvas ref={canvasRef}></canvas>
            </div>
        </div>
    );
};

export default PdfToFabric;
