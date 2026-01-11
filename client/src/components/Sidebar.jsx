import React, { useState } from 'react';
import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  FileText,
  FilePlus,
  Globe,
  ArrowLeftRight,
  User,
  Palette,
  Menu,
  X,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import { cn } from '../lib/utils';
import { Button } from './ui/button';
import { Separator } from './ui/separator';

const Sidebar = () => {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isMobileOpen, setIsMobileOpen] = useState(false);

  const navItems = [
    { path: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
    { path: '/my-gists', icon: FileText, label: 'My Gists' },
    { path: '/gist', icon: FilePlus, label: 'New Gist' },
    { path: '/shared', icon: Globe, label: 'Community' },
    { path: '/convert', icon: ArrowLeftRight, label: 'Convert' },
    { path: '/profile', icon: User, label: 'Profile' }
  ];

  const devItems = [
    { path: '/theme-sandbox', icon: Palette, label: 'Theme Sandbox' }
  ];

  return (
    <>
      {/* Mobile menu button */}
      <Button
        variant="ghost"
        size="icon"
        onClick={() => setIsMobileOpen(!isMobileOpen)}
        className="lg:hidden fixed top-4 left-4 z-50"
      >
        {isMobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
      </Button>

      {/* Mobile overlay */}
      {isMobileOpen && (
        <div
          className="lg:hidden fixed inset-0 bg-black/50 z-40"
          onClick={() => setIsMobileOpen(false)}
        />
      )}

      {/* Sidebar */}
      <nav
        className={cn(
          'fixed lg:relative h-full flex-shrink-0 bg-card border-r transition-all duration-300 ease-in-out z-40 overflow-y-auto',
          isCollapsed ? 'w-16' : 'w-64',
          isMobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        )}
      >
        <div className="p-4">
          {/* Collapse toggle for desktop */}
          <div className="hidden lg:flex items-center justify-between mb-6">
            {!isCollapsed && (
              <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                Navigation
              </h2>
            )}
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setIsCollapsed(!isCollapsed)}
              className="h-8 w-8"
              title={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            >
              {isCollapsed ? (
                <ChevronRight className="h-4 w-4" />
              ) : (
                <ChevronLeft className="h-4 w-4" />
              )}
            </Button>
          </div>

          {/* Mobile header */}
          <div className="lg:hidden mb-6">
            <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
              Navigation
            </h2>
          </div>

          {/* Main navigation */}
          <ul className="flex flex-col gap-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              return (
                <li key={item.path}>
                  <NavLink
                    to={item.path}
                    onClick={() => setIsMobileOpen(false)}
                    className={({ isActive }) =>
                      cn(
                        'flex items-center gap-3 px-3 py-2 rounded-md transition-colors text-sm font-medium',
                        isActive
                          ? 'bg-primary text-primary-foreground'
                          : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground',
                        isCollapsed && 'justify-center'
                      )
                    }
                    title={isCollapsed ? item.label : ''}
                  >
                    <Icon className="h-5 w-5 flex-shrink-0" />
                    {!isCollapsed && <span className="truncate">{item.label}</span>}
                  </NavLink>
                </li>
              );
            })}

            {/* Development Tools - only show in development mode */}
            {process.env.NODE_ENV === 'development' && (
              <>
                <li className="pt-4 mt-4">
                  <Separator />
                </li>
                {!isCollapsed && (
                  <li className="px-3 py-2">
                    <span className="text-xs text-muted-foreground font-medium uppercase tracking-wide">
                      Development
                    </span>
                  </li>
                )}
                {devItems.map((item) => {
                  const Icon = item.icon;
                  return (
                    <li key={item.path}>
                      <NavLink
                        to={item.path}
                        onClick={() => setIsMobileOpen(false)}
                        className={({ isActive }) =>
                          cn(
                            'flex items-center gap-3 px-3 py-2 rounded-md transition-colors text-sm font-medium',
                            isActive
                              ? 'bg-primary text-primary-foreground'
                              : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground',
                            isCollapsed && 'justify-center'
                          )
                        }
                        title={isCollapsed ? item.label : ''}
                      >
                        <Icon className="h-5 w-5 flex-shrink-0" />
                        {!isCollapsed && <span className="truncate">{item.label}</span>}
                      </NavLink>
                    </li>
                  );
                })}
              </>
            )}
          </ul>
        </div>
      </nav>
    </>
  );
};

export default Sidebar;
