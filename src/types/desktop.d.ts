export {};

declare global {
  interface Window {
    kabaddiDesktop?: {
      openOverlay: (
        host: string,
        port: number,
      ) => Promise<{ ok: boolean; message?: string }>;
      closeOverlay: () => Promise<{ ok: boolean; message?: string }>;
      reportOverlayStatus: (status: {
        connected: boolean;
        message: string;
      }) => void;
      onOverlayStatus: (
        callback: (status: { connected: boolean; message: string }) => void,
      ) => () => void;
    };
  }
}
