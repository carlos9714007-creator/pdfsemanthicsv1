/// <reference types="vite/client" />

declare module 'pdfjs-dist' {
    export const GlobalWorkerOptions: any;
    export const version: string;
    export function getDocument(args: any): any;
}

declare module 'jsqr' {
    export default function jsQR(data: Uint8ClampedArray, width: number, height: number): any;
}
