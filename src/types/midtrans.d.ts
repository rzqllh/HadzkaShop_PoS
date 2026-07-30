export {};

declare global {
  interface Window {
    snap?: {
      pay(
        token: string,
        callbacks: {
          onSuccess: () => void;
          onPending: () => void;
          onError: () => void;
          onClose: () => void;
        },
      ): void;
    };
  }
}
