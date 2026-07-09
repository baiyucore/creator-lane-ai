import { useTheme } from './theme-provider';
import { useEffect, useState } from 'react';
import { Button } from './ui/button';
import { Sun, Moon } from 'lucide-react';

export function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <Button type="button" variant="outline" size="icon" disabled aria-label="主题">
        <Sun />
      </Button>
    );
  }

  const isDark = resolvedTheme === 'dark';

  return (
    <Button
      type="button"
      variant="outline"
      size="icon"
      onClick={() => setTheme(isDark ? 'light' : 'dark')}
      aria-label={isDark ? '切换到亮色模式' : '切换到暗色模式'}
    >
      {isDark ? <Sun /> : <Moon />}
    </Button>
  );
}
