import { AppAlertDialogVariant } from './components/app-alert-dialog';

export type AppAlertOptions = {
  title: string;
  description?: string;
  variant?: AppAlertDialogVariant;
  confirmLabel?: string;
  cancelLabel?: string;
  showCancel?: boolean;
  onConfirm?: () => void | Promise<void>;
  onCancel?: () => void | Promise<void>;
};

export type AppAlertRequest = AppAlertOptions & {
  id: number;
  resolve: (accepted: boolean) => void;
};

type AppAlertListener = (request: AppAlertRequest) => void;

let nextAlertId = 1;
let listener: AppAlertListener | null = null;
const pendingRequests: AppAlertRequest[] = [];

const dispatchRequest = (request: AppAlertRequest) => {
  if (listener) {
    listener(request);
    return;
  }
  pendingRequests.push(request);
};

export const registerAppAlertListener = (nextListener: AppAlertListener) => {
  listener = nextListener;
  if (pendingRequests.length) {
    const queued = pendingRequests.splice(0, pendingRequests.length);
    queued.forEach((request) => nextListener(request));
  }

  return () => {
    if (listener === nextListener) {
      listener = null;
    }
  };
};

export const presentAppAlert = (options: AppAlertOptions) =>
  new Promise<boolean>((resolve) => {
    const request: AppAlertRequest = {
      ...options,
      id: nextAlertId,
      resolve,
    };
    nextAlertId += 1;
    dispatchRequest(request);
  });

export const notifyAppAlert = (
  title: string,
  description?: string,
  variant: AppAlertDialogVariant = 'info',
) =>
  presentAppAlert({
    title,
    description,
    variant,
    showCancel: false,
    confirmLabel: 'Entendi',
  });
