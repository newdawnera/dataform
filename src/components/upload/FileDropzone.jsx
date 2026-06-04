import { useRef, useState } from "react";
import { AlertCircle, FileUp, Loader2, UploadCloud } from "lucide-react";

import { ACCEPTED_DATASET_FILE_TYPES } from "../../utils/csvParser";

export default function FileDropzone({ onFileSelect, status }) {
  const [isDragging, setIsDragging] = useState(false);
  const inputRef = useRef(null);
  const isParsing = status === "parsing";
  const isError = status === "error";

  const handleFiles = (fileList) => {
    const file = fileList?.[0];
    if (file) onFileSelect(file);
  };

  const handleInputChange = (event) => {
    handleFiles(event.target.files);
    event.target.value = "";
  };

  const handleDrop = (event) => {
    event.preventDefault();
    setIsDragging(false);
    if (!isParsing) handleFiles(event.dataTransfer.files);
  };

  const handleKeyDown = (event) => {
    if (isParsing) return;
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      inputRef.current?.click();
    }
  };

  const openPicker = () => {
    if (!isParsing) inputRef.current?.click();
  };

  const zoneClass = isParsing
    ? "border-slate-300 bg-slate-50 cursor-wait opacity-80"
    : isError
      ? "border-rose-300 bg-rose-50 hover:border-rose-400"
      : isDragging
        ? "border-blue-500 bg-blue-50 scale-[1.01]"
        : "border-slate-300 bg-white hover:border-blue-400 hover:bg-slate-50";

  return (
    <div
      aria-label="File upload area — drop a CSV or Excel file, or press Enter to browse"
      className={`relative flex min-h-80 cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed px-6 py-10 text-center shadow-sm transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 ${zoneClass}`}
      onClick={openPicker}
      onDragEnter={(e) => { e.preventDefault(); if (!isParsing) setIsDragging(true); }}
      onDragLeave={(e) => { e.preventDefault(); setIsDragging(false); }}
      onDragOver={(e) => e.preventDefault()}
      onDrop={handleDrop}
      onKeyDown={handleKeyDown}
      role="button"
      tabIndex={0}
    >
      {isParsing && (
        <div
          aria-live="polite"
          className="absolute inset-0 flex flex-col items-center justify-center gap-3 rounded-xl bg-white/80 backdrop-blur-sm"
        >
          <Loader2 aria-hidden="true" className="h-8 w-8 animate-spin text-blue-600" />
          <p className="text-sm font-semibold text-slate-700">Parsing file...</p>
        </div>
      )}

      <div
        aria-hidden="true"
        className={`mb-5 rounded-full p-4 ${isError ? "bg-rose-100 text-rose-600" : "bg-blue-50 text-blue-600"}`}
      >
        {isError ? (
          <AlertCircle className="h-10 w-10" />
        ) : (
          <UploadCloud className="h-10 w-10" />
        )}
      </div>

      <h2 className="text-xl font-bold text-slate-900">
        {isError ? "Import another file" : "Import Data File"}
      </h2>
      <p className="mt-2 max-w-md text-sm leading-6 text-slate-500">
        {isError
          ? "The previous file had issues. Drop a new CSV or .xlsx to try again, or use the button below."
          : "Drop a CSV or .xlsx file here, or select one from your computer. Files stay in local browser memory."}
      </p>

      <input
        accept={ACCEPTED_DATASET_FILE_TYPES}
        aria-label="Choose a CSV or Excel file to upload"
        className="hidden"
        disabled={isParsing}
        onChange={handleInputChange}
        ref={inputRef}
        type="file"
      />

      <span
        aria-hidden="true"
        className="mt-6 inline-flex min-h-10 items-center gap-2 rounded-lg bg-slate-900 px-5 py-2 text-sm font-semibold text-white shadow-sm"
      >
        <FileUp className="h-4 w-4" />
        Choose File
      </span>

      {isDragging && (
        <span aria-live="assertive" className="sr-only">
          Drop the file now to upload
        </span>
      )}
    </div>
  );
}
