import { createContext, useContext, type ReactNode } from "react";

import { useAppController, type AppContextValue } from "../hooks/useAppController.ts";

const AppContext = createContext<AppContextValue | null>(null);

export const AppProvider = ({ children }: { children: ReactNode }) => {
  const value = useAppController();

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
};

export const useAppContext = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error("useAppContext must be used within AppProvider.");
  }

  return context;
};