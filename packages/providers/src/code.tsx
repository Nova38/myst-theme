import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import {
  bundledLanguages,
  bundledThemes,
  createHighlighter,
  getSingletonHighlighter,
  Highlighter,
} from 'shiki';

interface ShikiContextType {
  highlighter: Highlighter | null;
}

const ShikiContext = createContext<ShikiContextType | undefined>(undefined);

export const ShikiProvider = ({ children }: { children: ReactNode }) => {
  const [highlighter, setHighlighter] = useState<Highlighter | null>(null);

  useEffect(() => {
    const loadHighlighter = async () => {
      const highlighter = await getSingletonHighlighter({
        themes: Object.keys(bundledThemes), //['vitesse-dark'],
        langs: Object.keys(bundledLanguages),
      });
      // const highlighter = await getSingletonHighlighter();
      setHighlighter(highlighter);
    };

    loadHighlighter();
  }, []);

  return <ShikiContext.Provider value={{ highlighter }}>{children}</ShikiContext.Provider>;
};

export const useShiki = (): ShikiContextType => {
  const context = useContext(ShikiContext);
  if (context === undefined) {
    throw new Error('useShiki must be used within a ShikiProvider');
  }
  return context;
};
