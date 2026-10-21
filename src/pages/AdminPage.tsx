import { useState } from 'react';
import * as Tabs from '@radix-ui/react-tabs';
import { motion } from 'framer-motion';
import { Camera, Coins, DoorClosed, Film, Image as ImageIcon, LogOut, Newspaper, Settings, Shield, Sparkles, Swords, Users, Wrench } from 'lucide-react';
import { AdminGate } from '@/components/admin/AdminGate';
import { ClubManager } from '@/components/admin/ClubManager';
import { GateManager } from '@/components/admin/GateManager';
import { LleidalitosManager } from '@/components/admin/LleidalitosManager';
import { VideoManager } from '@/components/admin/VideoManager';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { GATE_LABEL } from '@/lib/gate';
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
  { id: 'videos', label: 'Vídeos', icon: Film },
  { id: 'lleidalitos', label: 'Lleidalitos', icon: Coins },
  { id: 'news', label: 'Comunicats', icon: Newspaper },
  { id: 'club', label: 'Club', icon: Sparkles },
  { id: 'access', label: 'Accés', icon: DoorClosed },
  { id: 'settings', label: 'Ajustos i còpia', icon: Settings },
] as const;

type TabId = (typeof TABS)[number]['id'];

export default function AdminPage() {
  const unlocked = useUiStore((s) => s.adminUnlocked);
  const lock = useUiStore((s) => s.lockAdmin);
  const toast = useUiStore((s) => s.toast);
  const gate = useLeagueStore((s) => s.settings.gate);
  const setGate = useLeagueStore((s) => s.setGate);
  const [confirmMaintenance, setConfirmMaintenance] = useState(false);
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
          <div className="flex flex-wrap gap-3">
            {gate.mode === 'maintenance' ? (
              <button
                className="btn border border-emerald-400/40 bg-emerald-400/10 text-emerald-300 hover:bg-emerald-400/20"
                onClick={() => {
                  setGate({ mode: 'off' });
                  toast('Manteniment desactivat: la web torna a ser oberta.');
                }}
              >
                <Wrench size={16} /> Desactiva el manteniment
              </button>
            ) : (
              <button className="btn-danger" onClick={() => setConfirmMaintenance(true)}>
                <Wrench size={16} /> Mode manteniment
              </button>
            )}
            <button
              className="btn-ghost"
              onClick={() => {
                lock();
                toast('Sessió d’administrador tancada.', 'info');
              }}
            >
              <LogOut size={16} /> Tanca la sessió
            </button>
          </div>
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

      {gate.mode !== 'off' && (
        <button
          onClick={() => setTab('access')}
          className="mb-6 flex w-full items-center gap-3 rounded-2xl border border-amber-400/50 bg-amber-400/10 px-4 py-3 text-left text-sm text-amber-200 transition hover:bg-amber-400/15"
        >
          <Wrench size={18} className="shrink-0" />
          <span>
            <strong>{GATE_LABEL[gate.mode]} actiu.</strong> Els visitants no poden entrar a la web; tu sí. Toca aquí per configurar-ho.
          </span>
        </button>
      )}

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
        <Tabs.Content value="videos" className="outline-none"><VideoManager /></Tabs.Content>
        <Tabs.Content value="lleidalitos" className="outline-none"><LleidalitosManager /></Tabs.Content>
        <Tabs.Content value="news" className="outline-none"><NewsManager /></Tabs.Content>
        <Tabs.Content value="club" className="outline-none"><ClubManager /></Tabs.Content>
        <Tabs.Content value="access" className="outline-none"><GateManager /></Tabs.Content>
        <Tabs.Content value="settings" className="outline-none"><SettingsPanel /></Tabs.Content>
      </Tabs.Root>

      <ConfirmDialog
        open={confirmMaintenance}
        title="Activar el mode manteniment"
        message="Els visitants deixaran de poder entrar a la web i veuran un avís de manteniment fins que el desactivis. Tu continuaràs veient-la com a administrador."
        confirmLabel="Sí, activa'l"
        onCancel={() => setConfirmMaintenance(false)}
        onConfirm={() => {
          setConfirmMaintenance(false);
          setGate({ mode: 'maintenance', launchAt: '' });
          toast('Mode manteniment activat: els visitants ja no poden entrar.', 'info');
        }}
      />
    </div>
  );
}
