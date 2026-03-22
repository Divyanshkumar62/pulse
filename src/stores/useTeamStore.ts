import { create } from 'zustand';
import { Team, Invitation, TeamRole } from '../types';
import { getTeams, getAllInvitations, createTeam, inviteToTeam, acceptInvitation, declineInvitation } from '../hooks/useTauri';
import { useSettingsStore } from './useSettingsStore';

interface TeamStore {
  teams: Team[];
  invitations: Invitation[];
  isLoading: boolean;
  initialize: () => Promise<void>;
  createNewTeam: (name: string) => Promise<void>;
  inviteMember: (teamId: string, teamName: string, email: string, role: TeamRole) => Promise<void>;
  acceptInvite: (id: string) => Promise<void>;
  declineInvite: (id: string) => Promise<void>;
}

export const useTeamStore = create<TeamStore>((set, get) => ({
  teams: [],
  invitations: [],
  isLoading: false,
  
  initialize: async () => {
    set({ isLoading: true });
    try {
      const [teams, invitations] = await Promise.all([getTeams(), getAllInvitations()]);
      set({ teams, invitations });
    } catch (e) {
      console.error('Failed to load teams:', e);
    } finally {
      set({ isLoading: false });
    }
  },

  createNewTeam: async (name) => {
    const settings = useSettingsStore.getState().settings;
    if (!settings) return;
    const team = await createTeam(name, settings.email, settings.name);
    set({ teams: [...get().teams, team] });
  },

  inviteMember: async (teamId, teamName, email, role) => {
    const settings = useSettingsStore.getState().settings;
    if (!settings) return;
    const inv = await inviteToTeam(teamId, teamName, email, role, settings.email, settings.name);
    set({ invitations: [...get().invitations, inv] });
  },

  acceptInvite: async (id) => {
    await acceptInvitation(id);
    const [teams, invitations] = await Promise.all([getTeams(), getAllInvitations()]);
    set({ teams, invitations });
  },

  declineInvite: async (id) => {
    await declineInvitation(id);
    set(state => ({
      invitations: state.invitations.map(i => i.id === id ? { ...i, status: 'declined' as const } : i)
    }));
  }
}));
