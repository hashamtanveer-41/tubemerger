import React from 'react';
import { Home, LayoutGrid, Video, ListVideo, Clock, Download, Music, ArrowUpCircle, Compass } from 'lucide-react';
import { cn } from '@/lib/utils';
import { UpdateInfo } from '@/types';

interface SidebarProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
  updateInfo?: UpdateInfo | null;
  onStartTour?: () => void;
}

export function Sidebar({ activeTab, onTabChange, updateInfo, onStartTour }: SidebarProps) {
  const navItems = [
    { id: 'home',         label: 'Home',               icon: Home       },
    { id: 'merge',        label: 'Merge Playlists',    icon: LayoutGrid },
    { id: 'single-video', label: 'Download Video',     icon: Video      },
    { id: 'audio',        label: 'Audio Studio (MP3)', icon: Music      },
    { id: 'queues',       label: 'Merge Queues',       icon: ListVideo  },
    { id: 'history',      label: 'History',            icon: Clock      },
  ];

  return (
    <aside id="sidebar-nav" className="w-56 bg-[#0F0F0F] border-r border-[#212121] flex flex-col justify-between py-4 px-2 shrink-0 select-none">
      <nav className="space-y-1">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive =
            activeTab === item.id ||
            (item.id === 'audio' && (activeTab === 'audio' || activeTab === 'audio-download' || activeTab === 'audio-merge'));
          return (
            <button
              key={item.id}
              onClick={() => onTabChange(item.id)}
              className={cn(
                'w-full flex items-center px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all duration-150 cursor-pointer text-left group',
                isActive
                  ? 'bg-[#212121] text-white border-l-4 border-[#FF0000] font-semibold pl-2.5'
                  : 'text-[#AAAAAA] hover:bg-[#181818] hover:text-white'
              )}
            >
              <Icon
                className={cn(
                  'w-4 h-4 shrink-0 mr-3 transition-colors',
                  isActive ? 'text-brand-red' : 'text-white group-hover:text-white group-active:text-brand-red'
                )}
              />
              <span>{item.label}</span>
            </button>
          );
        })}
      </nav>

      <div className="pt-4 border-t border-[#212121] px-2 space-y-2">
        {onStartTour && (
          <button
            onClick={onStartTour}
            className="w-full flex items-center px-2.5 py-1.5 rounded-lg text-xs font-medium text-[#CCCCCC] hover:text-white hover:bg-[#1A1A1A] active:border-brand-red transition-colors cursor-pointer gap-2 border border-[#272727] group"
          >
            <Compass className="w-3.5 h-3.5 text-white group-hover:text-white group-active:text-brand-red shrink-0 transition-colors" />
            <span>App Tour Guide</span>
          </button>
        )}

        <p className="text-[10px] uppercase font-bold tracking-wider text-[#666666] pt-1">
          Supported Formats
        </p>
        <div className="flex items-center space-x-2.5 text-xs text-[#777777] py-1 px-1">
          <Download className="w-3.5 h-3.5 text-white" />
          <span>MP4 Video (up to 4K)</span>
        </div>
        <div className="flex items-center space-x-2.5 text-xs text-[#777777] py-1 px-1">
          <Music className="w-3.5 h-3.5 text-white" />
          <span>MP3 Audio (320kbps)</span>
        </div>

        {/* Version indicator */}
        <div className="pt-2 flex items-center justify-between">
          <span className="text-[10px] text-[#444444] font-mono">
            v{updateInfo?.current_version ?? '1.0.5'}
          </span>
          {updateInfo?.update_available && !updateInfo.is_force_update && (
            <span
              className="flex items-center gap-1 text-[10px] text-[#FF3B30]"
              title={`v${updateInfo.latest_version} available`}
            >
              <ArrowUpCircle className="w-3 h-3" />
              Update
            </span>
          )}
        </div>
      </div>
    </aside>
  );
}
