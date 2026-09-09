import { createContext, useCallback, useContext, useMemo, useState } from "react";
import type { Freshness } from "../api/types";

interface ConnectionState {
  freshness?: Freshness;
}

const ConnectionContext = createContext<{ state: ConnectionState; setFreshness: (freshness: Freshness) => void }>({
  state: {},
  setFreshness: () => {},
});

export function ConnectionProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<ConnectionState>({});
  const setFreshness = useCallback((freshness: Freshness) => setState({ freshness }), []);
  const value = useMemo(() => ({ state, setFreshness }), [state, setFreshness]);
  return <ConnectionContext.Provider value={value}>{children}</ConnectionContext.Provider>;
}

export function useConnection() {
  return useContext(ConnectionContext);
}
