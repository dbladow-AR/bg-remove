import React, { useState, useEffect } from "react";
import type { ImageFile } from "../App";
import { EditModal } from "./EditModal";
import JSZip from 'jszip';

interface ImagesProps {
  images: ImageFile[];
  onDelete: (id: number) => void;
}

export function Images({ images, onDelete }: ImagesProps) {
  const handleDownloadAll = async () => {
    const zip = new JSZip();
    
    for (const image of images) {
      if (image.processedFile) {
        const fileName = `processed-${image.id}.png`;
        zip.file(fileName, image.processedFile);
      }
    }
    
    const content = await zip.generateAsync({ type: "blob" });
    const url = URL.createObjectURL(content);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'processed-images.zip';
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-gray-800 text-xl font-semibold">Images: {images.length}</h2>
        {images.length > 1 && (
          <button
            onClick={handleDownloadAll}
            className="flex items-center gap-2 px-4 py-2 bg-green-50 text-green-600 rounded-md hover:bg-green-100 transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
            Download All (.zip)
          </button>
        )}
      </div>
      <div className="gap-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {images.map((image) => {
          if(image.file.type.includes("video")) {
            return <Video video={image} key={image.id} />;
          } else {
            return <ImageSpot image={image} onDelete={onDelete} key={image.id} />;
          }
        })}
      </div>
    </div>
  );
}

function Video({ video }: { video: ImageFile }) {
  const url = URL.createObjectURL(video.file);
  return (
    <div className="bg-white rounded-lg shadow-md p-3">
      <video
        className="rounded-lg aspect-square object-cover"
        loop
        muted
        autoPlay
        src={url}
      ></video>
    </div>
  );
}

interface ImageSpotProps {
  image: ImageFile;
  onDelete: (id: number) => void;
}

function ImageSpot({ image, onDelete }: ImageSpotProps) {
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [processedImageUrl, setProcessedImageUrl] = useState("");
  const [showDownloadOptions, setShowDownloadOptions] = useState(false);
  const [menuPosition, setMenuPosition] = useState({ left: 0, top: 0 });
  const [selectedFormats, setSelectedFormats] = useState<('png' | 'svg')[]>([]);
  const [downloadedSizes, setDownloadedSizes] = useState<string[]>([]);

  const url = URL.createObjectURL(image.file);
  const processedURL = image.processedFile ? URL.createObjectURL(image.processedFile) : "";
  const isProcessing = !image.processedFile;

  useEffect(() => {
    if (showDownloadOptions) {
      const element = document.querySelector(`[data-image-id="${image.id}"]`);
      if (element) {
        const rect = element.getBoundingClientRect();
        setMenuPosition({
          left: rect.right + 16,
          top: rect.top
        });
      }
    }
  }, [showDownloadOptions, image.id]);

  const downloadSizes = [
    { id: 'original', label: 'Original Size', width: null, height: null },
    { id: 'favicon', label: 'Favicon (32x32)', width: 32, height: 32 },
    { id: 'icon', label: 'Icon (64x64)', width: 64, height: 64 },
    { id: 'thumbnail', label: 'Thumbnail (150x150)', width: 150, height: 150 },
    { id: 'medium', label: 'Medium (512x512)', width: 512, height: 512 },
    { id: 'large', label: 'Large (1024x1024)', width: 1024, height: 1024 },
    { id: 'xl', label: 'Extra Large (2048x2048)', width: 2048, height: 2048 }
  ];

  const handleEditSave = (editedImageUrl: string) => {
    setProcessedImageUrl(editedImageUrl);
  };

  const transparentBg = `url("data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQBAMAAADt3eJSAAAAAXNSR0IArs4c6QAAAARnQU1BAACxjwv8YQUAAAAGUExURb+/v////5nD/3QAAAAJcEhZcwAADsMAAA7DAcdvqGQAAAAUSURBVBjTYwABQSCglEENMxgYGAAynwRB8BEAgQAAAABJRU5ErkJggg==")`;

  const handleFormatSelect = (format: 'png' | 'svg') => {
    setSelectedFormats(prev => {
      if (prev.includes(format)) {
        return prev.filter(f => f !== format);
      }
      return [...prev, format];
    });
  };

  const handleSizeSelect = async (size: typeof downloadSizes[0]) => {
    for (const format of selectedFormats) {
      await handleDownload(format, size);
    }
    setDownloadedSizes(prev => [...prev, size.id]);
  };

  const handleDownload = async (format: 'png' | 'svg', size: typeof downloadSizes[0]) => {
    const img = new Image();
    img.src = processedImageUrl || processedURL;
    await new Promise(resolve => img.onload = resolve);

    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    if (size.width && size.height) {
      canvas.width = size.width;
      canvas.height = size.height;
    } else {
      canvas.width = img.width;
      canvas.height = img.height;
    }

    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

    const baseName = `processed-${image.id}`;
    const fileName = size.id === 'original' 
      ? `${baseName}-original.${format}`
      : `${baseName}-${size.width}x${size.height}.${format}`;

    if (format === 'svg') {
      const svgString = `
        <svg width="${canvas.width}" height="${canvas.height}" xmlns="http://www.w3.org/2000/svg">
          <image width="100%" height="100%" href="${canvas.toDataURL('image/png')}" />
        </svg>
      `;
      const blob = new Blob([svgString], { type: 'image/svg+xml' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = fileName;
      a.click();
      URL.revokeObjectURL(url);
    } else {
      canvas.toBlob((blob) => {
        if (!blob) return;
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = fileName;
        a.click();
        URL.revokeObjectURL(url);
      }, 'image/png');
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-md overflow-hidden" data-image-id={image.id}>
      <div className="relative">
        {isProcessing ? (
          <div className="relative">
            <img
              className="w-full aspect-square object-cover opacity-50 transition-opacity duration-200"
              src={url}
              alt={`Processing image ${image.id}`}
            />
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="bg-black bg-opacity-50 px-4 py-2 rounded-lg">
                <div className="inline-block animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-white mr-2"></div>
                <span className="text-white font-medium">Processing...</span>
              </div>
            </div>
          </div>
        ) : (
          <div 
            className="w-full aspect-square"
            style={{ 
              background: transparentBg,
              backgroundRepeat: 'repeat'
            }}
          >
            <img
              className="w-full h-full object-cover transition-opacity duration-200"
              src={processedImageUrl || processedURL}
              alt={`Processed image ${image.id}`}
            />
          </div>
        )}
      </div>

      {!isProcessing && (
        <div className="p-3 border-t border-gray-100">
          <div className="flex justify-center gap-2">
            <button
              onClick={() => onDelete(image.id)}
              className="flex items-center gap-1 px-3 py-1.5 bg-white border border-gray-200 rounded-md hover:bg-gray-50 transition-colors"
              title="Delete"
            >
              <svg className="w-4 h-4 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
              <span className="text-sm text-gray-700">Delete</span>
            </button>
            <button
              onClick={() => setIsEditModalOpen(true)}
              className="flex items-center gap-1 px-3 py-1.5 bg-white border border-gray-200 rounded-md hover:bg-gray-50 transition-colors"
              title="Edit"
            >
              <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
              </svg>
              <span className="text-sm text-gray-700">Edit</span>
            </button>
            <div className="relative">
              <button
                onClick={() => setShowDownloadOptions(!showDownloadOptions)}
                className="flex items-center gap-1 px-3 py-1.5 bg-white border border-gray-200 rounded-md hover:bg-gray-50 transition-colors"
                title="Download"
              >
                <svg className="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                </svg>
                <span className="text-sm text-gray-700">Download</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {showDownloadOptions && (
        <div 
          className="fixed z-50"
          style={{
            left: `${menuPosition.left}px`,
            top: `${menuPosition.top}px`
          }}
        >
          <div className="bg-white border border-gray-200 rounded-lg shadow-lg w-64">
            <div className="p-3 border-b border-gray-100">
              <h3 className="text-sm font-medium text-gray-700 mb-2">Download Options</h3>
              <div className="flex gap-2 justify-start">
                <button
                  onClick={() => handleFormatSelect('png')}
                  className={`flex items-center gap-2 px-3 py-1.5 text-sm rounded transition-colors ${
                    selectedFormats.includes('png')
                      ? 'bg-blue-100 text-blue-700'
                      : 'bg-blue-50 text-blue-600 hover:bg-blue-100'
                  }`}
                >
                  PNG
                  {selectedFormats.includes('png') && (
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                    </svg>
                  )}
                </button>
                <button
                  onClick={() => handleFormatSelect('svg')}
                  className={`flex items-center gap-2 px-3 py-1.5 text-sm rounded transition-colors ${
                    selectedFormats.includes('svg')
                      ? 'bg-green-100 text-green-700'
                      : 'bg-green-50 text-green-600 hover:bg-green-100'
                  }`}
                >
                  SVG
                  {selectedFormats.includes('svg') && (
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                    </svg>
                  )}
                </button>
              </div>
            </div>
            <div className="p-2">
              <h4 className="text-xs font-medium text-gray-500 mb-2 px-2">Select Size</h4>
              <div className="max-h-[calc(100vh-200px)] overflow-y-auto">
                {downloadSizes.map((size) => (
                  <div key={size.id} className="px-2">
                    <button
                      onClick={() => handleSizeSelect(size)}
                      disabled={selectedFormats.length === 0}
                      className={`w-full flex items-center justify-between py-2 px-3 text-sm rounded-md transition-colors ${
                        downloadedSizes.includes(size.id)
                          ? 'bg-gray-100 text-gray-700'
                          : selectedFormats.length === 0
                          ? 'text-gray-400 cursor-not-allowed'
                          : 'text-gray-700 hover:bg-gray-50'
                      }`}
                    >
                      <span>{size.label}</span>
                      {downloadedSizes.includes(size.id) && (
                        <svg className="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                        </svg>
                      )}
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>
          <div 
            className="fixed inset-0 z-[-1]" 
            onClick={() => {
              setShowDownloadOptions(false);
              setSelectedFormats([]);
              setDownloadedSizes([]);
            }}
          ></div>
        </div>
      )}

      <EditModal
        image={image}
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        onSave={handleEditSave}
      />
    </div>
  );
}
