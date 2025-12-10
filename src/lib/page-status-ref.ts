// Module-level ref for page status that doesn't cause re-renders
// This allows the editor to update status without triggering React re-renders
// that would interfere with typing and cursor position

export type PageStatus = "saved" | "saving" | "unsaved";

type StatusUpdateCallback = (status: PageStatus) => void;

let statusUpdateCallback: StatusUpdateCallback | null = null;
let currentStatus: PageStatus = "saved";

export function setPageStatus(status: PageStatus) {
  currentStatus = status;
  if (statusUpdateCallback) {
    statusUpdateCallback(status);
  }
}

export function getPageStatus(): PageStatus {
  return currentStatus;
}

export function registerStatusCallback(callback: StatusUpdateCallback) {
  statusUpdateCallback = callback;
  // Immediately call with current status
  callback(currentStatus);
}

export function unregisterStatusCallback() {
  statusUpdateCallback = null;
}

