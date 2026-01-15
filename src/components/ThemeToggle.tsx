import React from 'react';
import { Moon, Sun, Monitor } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { useTheme } from '@/hooks/useTheme';

export const ThemeToggle: React.FC = () => {
    const { theme, setTheme, effectiveTheme } = useTheme();

    return (
        <DropdownMenu>
            <Tooltip>
                <TooltipTrigger asChild>
                    <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm" className="h-9 w-9 px-0">
                            {effectiveTheme === 'dark' ? (
                                <Moon className="h-4 w-4" />
                            ) : (
                                <Sun className="h-4 w-4" />
                            )}
                            <span className="sr-only">Alternar tema</span>
                        </Button>
                    </DropdownMenuTrigger>
                </TooltipTrigger>
                <TooltipContent side="bottom">
                    <p>Alternar tema</p>
                </TooltipContent>
            </Tooltip>
            <DropdownMenuContent align="end" className="min-w-36">
                <DropdownMenuItem
                    onClick={() => setTheme('light')}
                    className="cursor-pointer"
                >
                    <Sun className="mr-2 h-4 w-4" />
                    <span>Claro</span>
                    {theme === 'light' && (
                        <div className="ml-auto h-2 w-2 rounded-full bg-primary" />
                    )}
                </DropdownMenuItem>
                <DropdownMenuItem
                    onClick={() => setTheme('dark')}
                    className="cursor-pointer"
                >
                    <Moon className="mr-2 h-4 w-4" />
                    <span>Escuro</span>
                    {theme === 'dark' && (
                        <div className="ml-auto h-2 w-2 rounded-full bg-primary" />
                    )}
                </DropdownMenuItem>
                <DropdownMenuItem
                    onClick={() => setTheme('system')}
                    className="cursor-pointer"
                >
                    <Monitor className="mr-2 h-4 w-4" />
                    <span>Sistema</span>
                    {theme === 'system' && (
                        <div className="ml-auto h-2 w-2 rounded-full bg-primary" />
                    )}
                </DropdownMenuItem>
            </DropdownMenuContent>
        </DropdownMenu>
    );
};