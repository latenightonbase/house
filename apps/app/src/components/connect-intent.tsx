"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
  type ComponentType,
  type ReactNode,
} from "react";

type ConnectWalletProps = {
  size?: "sm" | "md";
  showIcon?: boolean;
  className?: string;
};

type ConnectIntentValue = {
  walletUiReady: boolean;
  openConnect: () => void;
  bindOpenConnect: (fn: (() => void) | null) => void;
  ConnectWalletChrome: ComponentType<ConnectWalletProps> | null;
  setConnectWalletChrome: (chrome: ComponentType<ConnectWalletProps> | null) => void;
};

const ConnectIntentContext = createContext<ConnectIntentValue | null>(null);

export function ConnectIntentProvider({ children }: { children: ReactNode }) {
  const [walletUiReady, setWalletUiReady] = useState(false);
  const [ConnectWalletChrome, setChrome] = useState<ComponentType<ConnectWalletProps> | null>(
    null,
  );
  const openRef = useRef<(() => void) | null>(null);
  const pendingRef = useRef(false);

  const bindOpenConnect = useCallback((fn: (() => void) | null) => {
    openRef.current = fn;
    setWalletUiReady(!!fn);
    if (fn && pendingRef.current) {
      pendingRef.current = false;
      fn();
    }
  }, []);

  const setConnectWalletChrome = useCallback((chrome: ComponentType<ConnectWalletProps> | null) => {
    setChrome(() => chrome);
  }, []);

  const openConnect = useCallback(() => {
    if (openRef.current) {
      openRef.current();
      return;
    }
    pendingRef.current = true;
  }, []);

  const value = useMemo(
    () => ({
      walletUiReady,
      openConnect,
      bindOpenConnect,
      ConnectWalletChrome,
      setConnectWalletChrome,
    }),
    [walletUiReady, openConnect, bindOpenConnect, ConnectWalletChrome, setConnectWalletChrome],
  );

  return <ConnectIntentContext.Provider value={value}>{children}</ConnectIntentContext.Provider>;
}

function useConnectIntent() {
  const ctx = useContext(ConnectIntentContext);
  if (!ctx) throw new Error("useConnectIntent must be used within ConnectIntentProvider");
  return ctx;
}

export function useOpenConnect() {
  return useConnectIntent().openConnect;
}

export function useWalletUiReady() {
  return useContext(ConnectIntentContext)?.walletUiReady ?? false;
}

export function useBindConnectModal() {
  return useConnectIntent().bindOpenConnect;
}

export function useConnectWalletChrome() {
  return useConnectIntent().ConnectWalletChrome;
}

export function useSetConnectWalletChrome() {
  return useConnectIntent().setConnectWalletChrome;
}
