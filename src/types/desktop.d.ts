export {};

declare global {
  interface Window {
    kabaddiDesktop?: {
      startOverlayServer: (
        host: string,
        port: number,
        design: 'exact' | 'turbo',
        halfLabel: string,
      ) => Promise<{
        ok: boolean;
        url?: string;
        serverPort?: number;
        message?: string;
      }>;
      stopOverlayServer: () => Promise<{ ok: boolean }>;
      copyText: (text: string) => Promise<{ ok: boolean }>;
      onServerStopped: (callback: () => void) => () => void;
    };
  }
}
