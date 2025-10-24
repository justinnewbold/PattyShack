import { useState, useCallback } from 'react';

export const useConfirm = () => {
  const [confirmState, setConfirmState] = useState({
    isOpen: false,
    title: '',
    message: '',
    confirmText: 'Confirm',
    cancelText: 'Cancel',
    type: 'warning',
    onConfirm: () => {}
  });

  const confirm = useCallback(
    ({
      title = 'Confirm Action',
      message = 'Are you sure you want to proceed?',
      confirmText = 'Confirm',
      cancelText = 'Cancel',
      type = 'warning'
    }) => {
      return new Promise((resolve) => {
        setConfirmState({
          isOpen: true,
          title,
          message,
          confirmText,
          cancelText,
          type,
          onConfirm: () => resolve(true)
        });
      });
    },
    []
  );

  const close = useCallback(() => {
    setConfirmState(prev => ({ ...prev, isOpen: false }));
  }, []);

  return {
    confirmState,
    confirm,
    close
  };
};
