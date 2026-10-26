import { candidateTeam, optionHasTeam, type MvpCandidate } from '@/lib/mvp';
import { PlayerAvatar } from '@/components/ui/PlayerAvatar';
import { TeamCrest } from '@/components/ui/TeamCrest';

/** Picture of a vote answer: player photo, team crest (predictions) or a coloured disc with the initial. */
export function CandidateMark({ c, size }: { c: MvpCandidate; size: number }) {
  if (!c.option) return <PlayerAvatar player={c} team={candidateTeam(c)} size={size} />;
  if (optionHasTeam(c)) return <TeamCrest team={candidateTeam(c)} size={size} />;
  return (
    <span className="grid shrink-0 place-items-center rounded-full font-display font-black uppercase text-white" style={{ width: size, height: size, fontSize: size * 0.42, background: `radial-gradient(circle at 30% 25%, ${c.primaryColor}, #0b0f17 95%)`, boxShadow: `inset 0 0 0 ${Math.max(2, size / 22)}px rgba(255,255,255,.18)` }}>
      {c.name.trim().charAt(0)}
    </span>
  );
}
