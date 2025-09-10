'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, History, Settings } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

const links = [
  { href: '/', icon: Home, label: 'Dashboard' },
  { href: '/history', icon: History, label: 'History' },
  { href: '/settings', icon: Settings, label: 'Settings' },
];

type NavLinksProps = {
  isMobile?: boolean;
};

export function NavLinks({ isMobile = false }: NavLinksProps) {
  const pathname = usePathname();

  const linkClasses = (href: string) =>
    cn(
      'flex items-center gap-3 rounded-lg px-3 py-2 text-muted-foreground transition-all hover:text-primary',
      pathname === href && 'bg-muted text-primary'
    );
  
  const content = links.map((link) => (
    <Link key={link.href} href={link.href} className={linkClasses(link.href)}>
      <link.icon className="h-4 w-4" />
      {link.label}
    </Link>
  ));

  if (isMobile) {
    return <>{content}</>;
  }

  return (
    <TooltipProvider>
      {links.map((link) => (
        <Tooltip key={link.href}>
          <TooltipTrigger asChild>
            <Link href={link.href} className={linkClasses(link.href)}>
              <link.icon className="h-5 w-5" />
              <span className="sr-only">{link.label}</span>
            </Link>
          </TooltipTrigger>
          <TooltipContent side="right">
            <p>{link.label}</p>
          </TooltipContent>
        </Tooltip>
      ))}
    </TooltipProvider>
  );
}
