import { useState } from 'react';
import * as Tabs from '@radix-ui/react-tabs';
import { motion } from 'framer-motion';
import { Camera, Image as ImageIcon, LogOut, Newspaper, Settings, Shield, Sparkles, Swords, Users } from 'lucide-react';
import { AdminGate } from '@/components/admin/AdminGate';
import { ClubManager } from '@/components/admin/ClubManager';
import { GalleryManager } from '@/components/admin/GalleryManager';
import { MatchManager } from '@/components/admin/MatchManager';
import { NewsManager } from '@/components/admin/NewsManager';
import { PlayerManager } from '@/components/admin/PlayerManager';
import { SettingsPanel } from '@/components/admin/SettingsPanel';
import { SocialStudio } from '@/components/admin/SocialStudio';
import { TeamManager } from '@/components/admin/TeamManager';
import { PageHeader } from '@/components/ui/Section';
import { useLeagueStore } from '@/store/useLeagueStore';
import { useUiStore } from '@/store/useUiStore';
import { cn } from '@/lib/utils';

const TABS = [
  { id: 'matches', label: 'Partits', icon: Swords },
  { id: 'teams', label: 'Equips', icon: Shield },
  { id: 'players', label: 'Jugadors', icon: Users },
  { id: 'social', label: 'Xarxes', icon: Camera },
  { id: 'gallery', label: 'Galeria', icon: ImageIcon },
  { id: 'news', label: 'Comunicats', icon: Newspaper },
  { id: 'club', label: 'Club', icon: Sparkles },
  { id: 'settings', label: 'Ajustos i còpia', icon: Settings },
] as const;

type TabId = (typeof TABS)[number]['id'];

export default function AdminPage() {
  const unlocked = useUiStore((s) => s.adminUnlocked);
  const lock = useUiStore((s) => s.lockAdmin);
  const toast = useUiStore((s) => s.toast);
  const matches = useLeagueStore((s) => s.matches);
  const teams = useLeagueStore((s) => s.teams);
  const players = useLeagueStore((s) => s.players);
  const [tab, setTab] = useState<TabId>('matches');

  if (!unlocked) return <AdminGate />;

  const live = matches.filter((m) => m.status === 'live').length;

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
      <PageHeader
        eyebrow="Back-office"
        title="Tauler de control"
        description="Gestiona resultats, equips, jugadors i galeria, i crea imatges per a les xarxes. Tot es desa a l’instant i la classificació es recalcula sola."
        actions={
          <button
            className="btn-ghost"
            onClick={() => {
              lock();
              toast('Sessió d’administrador tancada.', 'info');
            }}
          >
            <LogOut size={16} /> Tanca la sessió
          </button>
        }
      />

      <div className="mb-7 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          ['Equips', teams.length],
          ['Jugadors', players.length],
          ['Partits', matches.length],
          ['En directe', live],
        ].map(([k, v]) => (
          <div key={k} className="card px-4 py-3">
            <p className="digital text-3xl text-gold-gradient">{v}</p>
            <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-400">{k}</p>
          </div>
        ))}
      </div>

      <Tabs.Root value={tab} onValueChange={(v) => setTab(v as TabId)}>
        <Tabs.List aria-label="Seccions del tauler" className="hide-scrollbar glass mb-7 flex gap-1 overflow-x-auto rounded-2xl p-1">
          {TABS.map((t) => {
            const Icon = t.icon;
            const active = tab === t.id;
            return (
              <Tabs.Trigger
                key={t.id}
                value={t.id}
                className={cn('relative flex shrink-0 items-center gap-2 rounded-xl px-4 py-2.5 font-display text-sm font-black uppercase tracking-wide transition-colors', active ? 'text-slate-950' : 'text-slate-400 hover:text-white')}
              >
                {active && <motion.span layoutId="admin-tab" className="absolute inset-0 rounded-xl bg-gold-gradient shadow-glow" transition={{ type: 'spring', damping: 28, stiffness: 380 }} />}
                <Icon size={16} className="relative" />
                <span className="relative">{t.label}</span>
              </Tabs.Trigger>
            );
          })}
        </Tabs.List>

        <Tabs.Content value="matches" className="outline-none"><MatchManager /></Tabs.Content>
        <Tabs.Content value="teams" className="outline-none"><TeamManager /></Tabs.Content>
        <Tabs.Content value="players" className="outline-none"><PlayerManager /></Tabs.Content>
        <Tabs.Content value="social" className="outline-none"><SocialStudio /></Tabs.Content>
        <Tabs.Content value="gallery" className="outline-none"><GalleryManager /></Tabs.Content>
        <Tabs.Content value="news" className="outline-none"><NewsManager /></Tabs.Content>
        <Tabs.Content value="club" className="outline-none"><ClubManager /></Tabs.Content>
        <Tabs.Content value="settings" className="outline-none"><SettingsPanel /></Tabs.Content>
      </Tabs.Root>
    </div>
  );
}
