import { createContext, useContext, useEffect, useState } from "react";

type Theme = "todoist" | "moonstone" | "tangerine" | "kale" | "blueberry" | "lavender" | "raspberry";

type ThemeProviderProps = {
  children: React.ReactNode;
  defaultTheme?: Theme;
  defaultDarkMode?: boolean;
};

type ThemeProviderState = {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  isDark: boolean;
  setIsDark: (isDark: boolean) => void;
  isAutoDark: boolean;
  setIsAutoDark: (isAuto: boolean) => void;
};

const initialState: ThemeProviderState = {
  theme: "todoist",
  setTheme: () => null,
  isDark: false,
  setIsDark: () => null,
  isAutoDark: false,
  setIsAutoDark: () => null,
};

const ThemeProviderContext = createContext<ThemeProviderState>(initialState);

export function ThemeProvider({
  children,
  defaultTheme = "todoist",
  defaultDarkMode = false,
}: ThemeProviderProps) {
  const [theme, setThemeState] = useState<Theme>(
    () => (localStorage.getItem("vite-ui-theme") as Theme) || defaultTheme
  );
  
  const [isDark, setIsDarkState] = useState<boolean>(() => {
    const stored = localStorage.getItem("vite-ui-dark-mode");
    if (stored !== null) return stored === "true";
    return defaultDarkMode;
  });

  const [isAutoDark, setIsAutoDarkState] = useState<boolean>(() => {
    const stored = localStorage.getItem("vite-ui-auto-dark");
    if (stored !== null) return stored === "true";
    return false;
  });

  const setTheme = (newTheme: Theme) => {
    setThemeState(newTheme);
    localStorage.setItem("vite-ui-theme", newTheme);
  };

  const setIsDark = (dark: boolean) => {
    setIsDarkState(dark);
    localStorage.setItem("vite-ui-dark-mode", String(dark));
    if (isAutoDark) {
      setIsAutoDarkState(false);
      localStorage.setItem("vite-ui-auto-dark", "false");
    }
  };

  const setIsAutoDark = (auto: boolean) => {
    setIsAutoDarkState(auto);
    localStorage.setItem("vite-ui-auto-dark", String(auto));
  };

  useEffect(() => {
    const root = window.document.documentElement;

    // Remove all theme classes
    root.classList.remove(
      "theme-todoist",
      "theme-moonstone",
      "theme-tangerine",
      "theme-kale",
      "theme-blueberry",
      "theme-lavender",
      "theme-raspberry"
    );

    // Add current theme class
    root.classList.add(`theme-${theme}`);
  }, [theme]);

  useEffect(() => {
    const root = window.document.documentElement;
    
    let shouldBeDark = isDark;
    
    if (isAutoDark) {
      shouldBeDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    }

    if (shouldBeDark) {
      root.classList.add("dark");
    } else {
      root.classList.remove("dark");
    }
  }, [isDark, isAutoDark]);

  // Listen to system changes if auto dark is enabled
  useEffect(() => {
    if (!isAutoDark) return;
    
    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
    const handleChange = (e: MediaQueryListEvent) => {
      const root = window.document.documentElement;
      if (e.matches) {
        root.classList.add("dark");
      } else {
        root.classList.remove("dark");
      }
    };
    
    mediaQuery.addEventListener("change", handleChange);
    return () => mediaQuery.removeEventListener("change", handleChange);
  }, [isAutoDark]);

  return (
    <ThemeProviderContext.Provider value={{ theme, setTheme, isDark, setIsDark, isAutoDark, setIsAutoDark }}>
      {children}
    </ThemeProviderContext.Provider>
  );
}

export const useTheme = () => {
  const context = useContext(ThemeProviderContext);

  if (context === undefined)
    throw new Error("useTheme must be used within a ThemeProvider");

  return context;
};
