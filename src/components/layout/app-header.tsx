'use client';

import { Menu, Bot } from 'lucide-react';
import Link from 'next/link';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { NavLinks } from './nav-links';

export function AppHeader() {
  return (
    <header className="flex h-14 items-center gap-4 border-b bg-background px-4 lg:h-[60px] lg:px-6">
      <Link href="/" className="flex items-center gap-2 font-semibold md:hidden">
        <Bot className="h-6 w-6 text-primary" />
        <span className="">ChartSage AI</span>
      </Link>
      <Sheet>
        <SheetTrigger asChild>
          <Button variant="outline" size="icon" className="shrink-0 md:hidden">
            <Menu className="h-5 w-5" />
            <span className="sr-only">Toggle navigation menu</span>
          </Button>
        </SheetTrigger>
        <SheetContent side="left" className="flex flex-col">
          <nav className="grid gap-2 text-lg font-medium">
            <Link
              href="/"
              className="mb-4 flex items-center gap-2 text-lg font-semibold"
            >
              <Bot className="h-6 w-6 text-primary" />
              <span>ChartSage AI</span>
            </Link>
            <NavLinks isMobile={true} />
          </nav>
        </SheetContent>
      </Sheet>
      <div className="w-full flex-1">
        {/* Can add search or other header items here */}
      </div>
    </header>
  );
}
