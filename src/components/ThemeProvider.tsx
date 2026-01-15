import React, { createContext, useContext, useEffect, useState } from 'react';

type Theme = 'light' | 'dark' | 'system';

interface ThemeContextType {
    theme: Theme;
    effectiveTheme: 'light' | 'dark';
    setTheme: (theme: Theme) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

interface ThemeProviderProps {
    children: React.ReactNode;
}

export const ThemeProvider: React.FC<ThemeProviderProps> = ({ children }) => {
    const [theme, setTheme] = useState<Theme>(() => {
        if (typeof window !== 'undefined') {
            return (localStorage.getItem('theme') as Theme) || 'system';
        }
        return 'system';
    });

    const [systemTheme, setSystemTheme] = useState<'light' | 'dark'>(() => {
        if (typeof window !== 'undefined') {
            return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
        }
        return 'light';
    });

    useEffect(() => {
        const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');

        const updateSystemTheme = () => {
            setSystemTheme(mediaQuery.matches ? 'dark' : 'light');
        };

        // Listen for system theme changes
        mediaQuery.addEventListener('change', updateSystemTheme);

        return () => {
            mediaQuery.removeEventListener('change', updateSystemTheme);
        };
    }, []);

    useEffect(() => {
        const root = window.document.documentElement;

        // Remove existing theme classes
        root.classList.remove('light', 'dark');

        let effectiveTheme: 'light' | 'dark';

        if (theme === 'system') {
            effectiveTheme = systemTheme;
        } else {
            effectiveTheme = theme;
        }

        // Apply theme class
        if (effectiveTheme === 'dark') {
            root.classList.add('dark');
        }

        // Store preference in localStorage
        localStorage.setItem('theme', theme);
    }, [theme, systemTheme]);

    const effectiveTheme = theme === 'system' ? systemTheme : theme;

    const value: ThemeContextType = {
        theme,
        effectiveTheme,
        setTheme,
    };

    return (
        <ThemeContext.Provider value={value}>
            {children}
        </ThemeContext.Provider>
    );
};