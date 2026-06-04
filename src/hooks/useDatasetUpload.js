import { useCallback, useMemo, useRef, useState } from "react";

import { profileDataset } from "../data/datasetProfiler";
import {
  parseCsv,
  PREVIEW_ROW_LIMIT,
  validateDatasetFile,
} from "../utils/csvParser";
import { parseExcelFile } from "../utils/excelParser";

const createInitialState = (datasetId = 0) => ({
  datasetId,
  errors: [],
  file: null,
  fileType: null,
  headers: [],
  profile: null,
  rowLengthWarnings: [],
  rows: [],
  status: "idle",
  warnings: [],
});

export default function useDatasetUpload() {
  const [state, setState] = useState(createInitialState);
  const nextDatasetIdRef = useRef(1);

  const getNextDatasetId = useCallback(() => {
    const datasetId = nextDatasetIdRef.current;
    nextDatasetIdRef.current += 1;
    return datasetId;
  }, []);

  const resetUpload = useCallback(() => {
    setState(createInitialState(getNextDatasetId()));
  }, [getNextDatasetId]);

  const importFile = useCallback(async (file) => {
    const validation = validateDatasetFile(file);
    const datasetId = getNextDatasetId();

    if (!validation.isValid) {
      setState({
        ...createInitialState(datasetId),
        errors: [validation.error],
        file: file || null,
        fileType: validation.fileType || null,
        status: "error",
      });
      return;
    }

    setState({
      ...createInitialState(datasetId),
      file,
      fileType: validation.fileType,
      status: "parsing",
    });

    try {
      const parsedDataset =
        validation.fileType === "xlsx"
          ? await parseExcelFile(file)
          : parseCsv(await file.text());

      if (parsedDataset.errors.length > 0) {
        setState({
          ...createInitialState(datasetId),
          errors: parsedDataset.errors,
          file,
          fileType: validation.fileType,
          headers: parsedDataset.headers,
          rowLengthWarnings: parsedDataset.rowLengthWarnings,
          status: "error",
          warnings: parsedDataset.warnings,
        });
        return;
      }

      const profile = profileDataset({
        delimiter: parsedDataset.delimiter,
        file,
        fileType: validation.fileType,
        headers: parsedDataset.headers,
        rowLengthWarnings: parsedDataset.rowLengthWarnings,
        rows: parsedDataset.rows,
      });

      setState({
        datasetId,
        errors: [],
        file,
        fileType: validation.fileType,
        headers: parsedDataset.headers,
        profile,
        rowLengthWarnings: parsedDataset.rowLengthWarnings,
        rows: parsedDataset.rows,
        status: "ready",
        warnings: [...parsedDataset.warnings, ...profile.warnings],
      });
    } catch {
      setState({
        ...createInitialState(datasetId),
        errors: ["This file could not be read. Please try another file."],
        file,
        fileType: validation.fileType,
        status: "error",
      });
    }
  }, [getNextDatasetId]);

  const previewRows = useMemo(
    () => state.rows.slice(0, PREVIEW_ROW_LIMIT),
    [state.rows],
  );

  return {
    ...state,
    importFile,
    previewLimit: PREVIEW_ROW_LIMIT,
    previewRows,
    resetUpload,
  };
}
