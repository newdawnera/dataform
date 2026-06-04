import { useRef, useState } from "react";
import { FileUp, UploadCloud } from "lucide-react";

import { ACCEPTED_DATASET_FILE_TYPES } from "../../utils/csvParser";

export default function FileDropzone({ onFileSelect, status }) {
  const [isDragging, setIsDragging] = useState(false);
  const inputRef = useRef(null);
  const isParsing = status === "parsing";

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

  return (
    <div
      className={`flex min-h-80 flex-col items-center justify-center rounded-xl border-2 border-dashed bg-white px-6 py-10 text-center shadow-sm transition-all ${
        isDragging
          ? "border-blue-500 bg-blue-50"
          : "border-slate-300 hover:border-blue-400 hover:bg-slate-50"
      } ${isParsing ? "cursor-wait opacity-75" : ""}`}
      onDragEnter={(event) => {
        event.preventDefault();
        if (!isParsing) setIsDragging(true);
      }}
      onDragLeave={(event) => {
        event.preventDefault();
        setIsDragging(false);
      }}
      onDragOver={(event) => event.preventDefault()}
      onDrop={handleDrop}
    >
      <div className="mb-5 rounded-full bg-blue-50 p-4 text-blue-600">
        <UploadCloud className="h-10 w-10" />
      </div>
      <h2 className="text-xl font-bold text-slate-900">Import Data File</h2>
      <p className="mt-2 max-w-md text-sm leading-6 text-slate-500">
        Drop a CSV or .xlsx file here, or select one from your computer. Files
        stay in local browser memory.
      </p>

      <input
        accept={ACCEPTED_DATASET_FILE_TYPES}
        className="hidden"
        disabled={isParsing}
        onChange={handleInputChange}
        ref={inputRef}
        type="file"
      />

      <button
        className="mt-6 inline-flex min-h-10 items-center gap-2 rounded-lg bg-slate-900 px-5 py-2 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-60"
        disabled={isParsing}
        onClick={() => inputRef.current?.click()}
        type="button"
      >
        <FileUp className="h-4 w-4" />
        Choose File
      </button>
    </div>
  );
}
