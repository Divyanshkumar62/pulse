import { describe, it, expect, beforeEach, vi } from 'vitest';
import { useEnvStore } from '../useEnvStore';
import { Environment } from '../../types';

// Mock the Tauri hooks used in the store
vi.mock('../../hooks/useTauri', () => ({
  loadEnvironments: vi.fn().mockResolvedValue([]),
  saveEnvironments: vi.fn().mockResolvedValue(undefined),
  saveWorkspaceToDisk: vi.fn().mockResolvedValue(undefined)
}));

vi.mock('../useWorkspaceStore', () => ({
  useWorkspaceStore: {
    getState: () => ({ activeWorkspaceId: 'default', workspaces: [{ id: 'default', path: '' }] })
  }
}));

describe('useEnvStore', () => {
  const mockEnv: Environment = {
    id: 'env-1',
    name: 'Development',
    variables: [{ key: 'API_URL', value: 'http://localhost', enabled: true }],
    pinned: false
  };

  beforeEach(() => {
    useEnvStore.setState({ environments: [], activeEnvId: null, isLoading: false });
  });

  it('should add a new environment', async () => {
    await useEnvStore.getState().addEnvironment(mockEnv);
    
    const envs = useEnvStore.getState().environments;
    expect(envs.length).toBe(1);
    expect(envs[0].name).toBe('Development');
  });

  it('should set active environment id', () => {
    useEnvStore.getState().setActiveEnvId('env-1');
    expect(useEnvStore.getState().activeEnvId).toBe('env-1');
  });

  it('should update an environment', async () => {
    await useEnvStore.getState().addEnvironment(mockEnv);
    await useEnvStore.getState().updateEnvironment('env-1', { name: 'Staging' });
    
    expect(useEnvStore.getState().environments[0].name).toBe('Staging');
  });

  it('should rename an environment', async () => {
    await useEnvStore.getState().addEnvironment(mockEnv);
    await useEnvStore.getState().renameEnvironment('env-1', 'Production');
    
    expect(useEnvStore.getState().environments[0].name).toBe('Production');
  });

  it('should duplicate an environment', async () => {
    await useEnvStore.getState().addEnvironment(mockEnv);
    await useEnvStore.getState().duplicateEnvironment('env-1');
    
    const envs = useEnvStore.getState().environments;
    expect(envs.length).toBe(2);
    expect(envs[1].name).toBe('Development (Copy)');
    expect(envs[1].id).not.toBe('env-1');
    expect(envs[1].variables).toEqual(mockEnv.variables);
  });

  it('should delete an environment and update activeEnvId if it was active', async () => {
    await useEnvStore.getState().addEnvironment(mockEnv);
    useEnvStore.setState({ activeEnvId: 'env-1' });
    
    await useEnvStore.getState().deleteEnvironment('env-1');
    
    expect(useEnvStore.getState().environments.length).toBe(0);
    expect(useEnvStore.getState().activeEnvId).toBe(null);
  });

  it('should pin an environment and sort it to the top', async () => {
    await useEnvStore.getState().addEnvironment(mockEnv);
    await useEnvStore.getState().addEnvironment({ ...mockEnv, id: 'env-2', name: 'Staging' });
    
    await useEnvStore.getState().togglePinEnvironment('env-2');
    
    const envs = useEnvStore.getState().environments;
    expect(envs[0].id).toBe('env-2'); // Should be first
    expect(envs[0].pinned).toBe(true);
    expect(envs[1].id).toBe('env-1');
    expect(envs[1].pinned).toBe(false);
  });
});