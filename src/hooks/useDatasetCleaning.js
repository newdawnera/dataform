import { useCallback, useMemo, useState } from "react";

import { cleanDataset } from "../data/datasetCleaner";
import {
  analyzeDatasetQuality,
  getDefaultCleaningOptions,
} from "../data/cleaningRules";

const EMPTY_OVERRIDES = {};

export default function useDatasetCleaning({ datasetId, headers, rows }) {
  const quality = useMemo(
    () => analyzeDatasetQuality({ headers, rows }),
    [headers, rows],
  );
  const defaultOptions = useMemo(
    () => getDefaultCleaningOptions(quality),
    [quality],
  );
  const [optionState, setOptionState] = useState({
    datasetId: null,
    overrides: EMPTY_OVERRIDES,
  });
  const [resultState, setResultState] = useState({
    datasetId: null,
    result: null,
  });
  const activeOverrides =
    optionState.datasetId === datasetId
      ? optionState.overrides
      : EMPTY_OVERRIDES;
  const options = useMemo(
    () => ({ ...defaultOptions, ...activeOverrides }),
    [activeOverrides, defaultOptions],
  );
  const cleaningResult =
    resultState.datasetId === datasetId ? resultState.result : null;

  const setOption = useCallback((optionKey, isEnabled) => {
    setOptionState((currentState) => ({
      datasetId,
      overrides: {
        ...(currentState.datasetId === datasetId
          ? currentState.overrides
          : EMPTY_OVERRIDES),
        [optionKey]: isEnabled,
      },
    }));
    setResultState({ datasetId, result: null });
  }, [datasetId]);

  const applyCleaning = useCallback(() => {
    setResultState({
      datasetId,
      result: cleanDataset({ headers, options, rows }),
    });
  }, [datasetId, headers, options, rows]);

  const resetCleaning = useCallback(() => {
    setOptionState({ datasetId, overrides: EMPTY_OVERRIDES });
    setResultState({ datasetId, result: null });
  }, [datasetId]);

  return {
    applyCleaning,
    cleaningResult,
    hasAppliedCleaning: Boolean(cleaningResult),
    options,
    quality,
    resetCleaning,
    setOption,
  };
}
