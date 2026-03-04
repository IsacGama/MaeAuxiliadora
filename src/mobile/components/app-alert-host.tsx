import { useEffect, useMemo, useState } from 'react';
import { registerAppAlertListener, AppAlertRequest } from '../app-alert';
import { useAppTheme } from '../theme';
import { AppAlertDialog } from './app-alert-dialog';

type AppAlertQueueItem = AppAlertRequest;

export const AppAlertHost = () => {
  const theme = useAppTheme();
  const [queue, setQueue] = useState<AppAlertQueueItem[]>([]);
  const [activeAlert, setActiveAlert] = useState<AppAlertQueueItem | null>(null);
  const [confirmLoading, setConfirmLoading] = useState(false);

  useEffect(() => {
    const unregister = registerAppAlertListener((request) => {
      setQueue((current) => [...current, request]);
    });

    return unregister;
  }, []);

  useEffect(() => {
    if (activeAlert || !queue.length) {
      return;
    }

    const [nextAlert, ...remaining] = queue;
    setActiveAlert(nextAlert);
    setQueue(remaining);
  }, [activeAlert, queue]);

  const finishAlert = (accepted: boolean) => {
    if (!activeAlert) {
      return;
    }
    activeAlert.resolve(accepted);
    setConfirmLoading(false);
    setActiveAlert(null);
  };

  const runConfirm = async () => {
    if (!activeAlert || confirmLoading) {
      return;
    }

    setConfirmLoading(true);
    try {
      await activeAlert.onConfirm?.();
      finishAlert(true);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'erro desconhecido';
      console.warn(`[alert] falha no callback de confirmação: ${message}`);
      finishAlert(false);
    }
  };

  const runCancel = async () => {
    if (!activeAlert || confirmLoading) {
      return;
    }

    setConfirmLoading(true);
    try {
      await activeAlert.onCancel?.();
    } finally {
      finishAlert(false);
    }
  };

  const dismissHandler = useMemo(() => {
    if (!activeAlert) {
      return runCancel;
    }
    return activeAlert.showCancel === false ? runConfirm : runCancel;
  }, [activeAlert, runCancel, runConfirm]);

  return (
    <AppAlertDialog
      visible={Boolean(activeAlert)}
      theme={theme}
      variant={activeAlert?.variant ?? 'info'}
      title={activeAlert?.title ?? ''}
      description={activeAlert?.description}
      confirmLabel={activeAlert?.confirmLabel ?? 'Confirmar'}
      cancelLabel={activeAlert?.cancelLabel ?? 'Cancelar'}
      showCancelButton={activeAlert?.showCancel !== false}
      confirmLoading={confirmLoading}
      onConfirm={runConfirm}
      onCancel={runCancel}
      onDismiss={dismissHandler}
    />
  );
};
