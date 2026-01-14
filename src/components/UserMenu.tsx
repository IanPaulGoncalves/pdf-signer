import React from 'react';
import { User, LogOut, Key, Sparkles } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';

interface UserMenuProps {
  onLoginClick: () => void;
}

export const UserMenu: React.FC<UserMenuProps> = ({ onLoginClick }) => {
  const { user, profile, signOut, loading } = useAuth();

  const handleSignOut = async () => {
    const { error } = await signOut();
    if (error) {
      toast.error('Erro ao sair: ' + error.message);
    } else {
      toast.success('Você saiu da sua conta');
    }
  };

  if (loading) {
    return (
      <div className="w-8 h-8 rounded-full bg-muted animate-pulse" />
    );
  }

  if (!user) {
    return (
      <Button variant="outline" size="sm" onClick={onLoginClick}>
        <User className="w-4 h-4 mr-2" />
        Entrar
      </Button>
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="sm" className="gap-2">
          <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
            <User className="w-4 h-4 text-primary" />
          </div>
          <span className="hidden sm:inline text-sm max-w-32 truncate">
            {user.email}
          </span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel>
          <div className="flex flex-col space-y-1">
            <p className="text-sm font-medium">Minha conta</p>
            <p className="text-xs text-muted-foreground truncate">
              {user.email}
            </p>
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        
        {profile && (
          <>
            <DropdownMenuItem disabled className="flex justify-between">
              <span>Assinaturas usadas:</span>
              <span className="font-medium">{profile.signatures_used}</span>
            </DropdownMenuItem>
            
            <DropdownMenuItem disabled className="flex justify-between">
              <span>Status:</span>
              {profile.is_premium ? (
                <span className="flex items-center gap-1 text-primary font-medium">
                  <Sparkles className="w-3 h-3" />
                  Premium
                </span>
              ) : (
                <span className="text-muted-foreground">Gratuito</span>
              )}
            </DropdownMenuItem>
            
            {profile.access_key && (
              <DropdownMenuItem disabled className="flex flex-col items-start gap-1">
                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                  <Key className="w-3 h-3" />
                  Chave de acesso:
                </div>
                <code className="text-xs bg-muted px-2 py-1 rounded w-full overflow-hidden text-ellipsis">
                  {profile.access_key}
                </code>
              </DropdownMenuItem>
            )}
            
            <DropdownMenuSeparator />
          </>
        )}
        
        <DropdownMenuItem onClick={handleSignOut} className="text-destructive">
          <LogOut className="w-4 h-4 mr-2" />
          Sair
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};
