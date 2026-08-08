import { isApiRequestError, type ApiValidationIssue } from "./api";

export type FormErrorState = {
  summaryMessage: string;
  summaryItems: string[];
  fieldErrors: Record<string, string>;
  rawIssues: ApiValidationIssue[];
};

export const emptyFormErrorState: FormErrorState = {
  summaryMessage: "",
  summaryItems: [],
  fieldErrors: {},
  rawIssues: [],
};

type CreateFormErrorStateOptions = {
  fallbackMessage: string;
  resolveField?: (issue: ApiValidationIssue) => string | null;
  getFieldLabel?: (field: string) => string;
};

function uniqueItems(values: string[]) {
  return Array.from(new Set(values.filter(Boolean)));
}

export function createFormErrorState(error: unknown, options: CreateFormErrorStateOptions): FormErrorState {
  if (!isApiRequestError(error)) {
    return {
      summaryMessage: error instanceof Error ? error.message : options.fallbackMessage,
      summaryItems: [],
      fieldErrors: {},
      rawIssues: [],
    };
  }

  const resolvedFieldErrors: Record<string, string> = {};
  const summaryItems: string[] = [];

  error.issues.forEach((issue) => {
    const field = options.resolveField?.(issue) ?? issue.key ?? null;
    if (field && !resolvedFieldErrors[field]) {
      resolvedFieldErrors[field] = issue.message;
    }

    if (field) {
      const label = options.getFieldLabel?.(field) ?? field;
      summaryItems.push(`${label}: ${issue.message}`);
      return;
    }

    summaryItems.push(issue.message);
  });

  const normalizedSummaryItems = uniqueItems(summaryItems);
  const summaryMessage = normalizedSummaryItems.length === 0
    ? error.message || options.fallbackMessage
    : normalizedSummaryItems.length === 1
      ? normalizedSummaryItems[0]!
      : "Corrige los campos marcados e inténtalo de nuevo.";

  return {
    summaryMessage,
    summaryItems: normalizedSummaryItems,
    fieldErrors: { ...error.fieldErrors, ...resolvedFieldErrors },
    rawIssues: error.issues,
  };
}

export function clearFormErrorField(state: FormErrorState, field: string): FormErrorState {
  const nextFieldErrors = Object.fromEntries(
    Object.entries(state.fieldErrors).filter(([key]) => key !== field && !key.startsWith(`${field}.`)),
  );

  if (Object.keys(nextFieldErrors).length === Object.keys(state.fieldErrors).length) {
    return state;
  }

  return {
    ...state,
    fieldErrors: nextFieldErrors,
  };
}

export function getFieldError(state: FormErrorState, field: string) {
  return state.fieldErrors[field] ?? "";
}
