import { create } from 'zustand';
import { Team, Invitation, TeamRole } from '../types';
import { getTeams, getAllInvitations, createTeam, inviteToTeam, acceptInvitation, declineInvitation, resendInvitation } from '../hooks/useTauri';
import { useSettingsStore } from './useSettingsStore';
import { logger } from '../lib/logger';

logger.info('TeamStore', 'module loaded');

interface TeamStore {
  teams: Team[];
  invitations: Invitation[];
  isLoading: boolean;
  error: string | null;
  clearError: () => void;
  initialize: () => Promise<void>;
  createNewTeam: (name: string) => Promise<void>;
  inviteMember: (teamId: string, teamName: string, email: string, role: TeamRole) => Promise<void>;
  resendInvite: (id: string) => Promise<void>;
  acceptInvite: (id: string) => Promise<void>;
  declineInvite: (id: string) => Promise<void>;
}

export const useTeamStore = create<TeamStore>((set, get) => ({
  teams: [],
  invitations: [],
  isLoading: false,
  error: null,

  clearError: () => set({ error: null }),
  
  initialize: async () => {
    logger.store('TeamStore', 'initialize() started');
    set({ isLoading: true, error: null });
    try {
      const [teams, invitations] = await Promise.all([getTeams(), getAllInvitations()]);
      logger.store('TeamStore', 'initialize() finished', { teams: teams.length, invitations: invitations.length }, 'OK');
      set({ teams, invitations });
    } catch (e: any) {
      logger.store('TeamStore', 'initialize() failed', e, 'ERR');
      set({ error: e.message || 'Failed to initialize teams' });
    } finally {
      set({ isLoading: false });
    }
  },

  createNewTeam: async (name) => {
    logger.store('TeamStore', 'createNewTeam() started', { name });
    const { settings } = useSettingsStore.getState();
    set({ error: null });
    
    if (!settings) {
      logger.store('TeamStore', 'createNewTeam() failed: Settings not found', null, 'ERR');
      const err = "Settings not initialized";
      set({ error: err });
      throw new Error(err);
    }
    
    try {
      const team = await createTeam(name, settings.email, settings.name);
      logger.store('TeamStore', 'createNewTeam() finished', { teamId: team.id }, 'OK');
      
      const newTeams = [...get().teams, team];
      set({ teams: newTeams });
    } catch (e: any) {
      logger.store('TeamStore', 'createNewTeam() failed', e, 'ERR');
      set({ error: e.message || 'Failed to create team' });
      throw e;
    }
  },

  inviteMember: async (teamId, teamName, email, role) => {
    logger.store('TeamStore', 'inviteMember() started', { teamId, email, role });
    set({ error: null });
    const settings = useSettingsStore.getState().settings;
    if (!settings) {
      const err = "Settings not available for invite";
      logger.store('TeamStore', 'inviteMember() failed', err, 'ERR');
      set({ error: err });
      throw new Error(err);
    }
    
    try {
      await inviteToTeam(teamId, teamName, email, role, settings.email, settings.name);
      logger.store('TeamStore', 'inviteMember() finished', null, 'OK');
      
      // Hard sync: Rehydrate invitations from backend to prevent counter/list desync
      const invitations = await getAllInvitations();
      set({ invitations });
    } catch (e: any) {
      logger.store('TeamStore', 'inviteMember() failed', e, 'ERR');
      set({ error: e.message || 'Failed to invite member' });
      throw e;
    }
  },

  resendInvite: async (id) => {
    logger.store('TeamStore', 'resendInvite() started', { id });
    set({ error: null });
    try {
      await resendInvitation(id);
      logger.store('TeamStore', 'resendInvite() finished', null, 'OK');
    } catch (e: any) {
      logger.store('TeamStore', 'resendInvite() failed', e, 'ERR');
      set({ error: e.message || 'Failed to resend invitation' });
      throw e;
    }
  },

  acceptInvite: async (id) => {
    logger.store('TeamStore', 'acceptInvite() started', { id });
    set({ error: null });
    try {
        await acceptInvitation(id);
        const [teams, invitations] = await Promise.all([getTeams(), getAllInvitations()]);
        set({ teams, invitations });
        logger.store('TeamStore', 'acceptInvite() finished', null, 'OK');
    } catch(e: any) {
        logger.store('TeamStore', 'acceptInvite() failed', e, 'ERR');
        set({ error: e.message || 'Failed to accept invitation' });
        throw e;
    }
  },

  declineInvite: async (id) => {
    logger.store('TeamStore', 'declineInvite() started', { id });
    set({ error: null });
    try {
        await declineInvitation(id);
        set(state => ({
          invitations: state.invitations.map(i => i.id === id ? { ...i, status: 'declined' as const } : i)
        }));
        logger.store('TeamStore', 'declineInvite() finished', null, 'OK');
    } catch(e: any) {
        logger.store('TeamStore', 'declineInvite() failed', e, 'ERR');
        set({ error: e.message || 'Failed to decline invitation' });
        throw e;
    }
  }
}));

logger.info('TeamStore', 'store created and exported');
