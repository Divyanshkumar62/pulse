import { useTabStore } from '../stores/useTabStore';
import { useCollectionStore } from '../stores/useCollectionStore';

class AutoSaveService {
  private timeout: number | null = null;
  private debounceMs = 1000;

  init() {
    // Subscribe to tab store changes
    useTabStore.subscribe((state, prevState) => {
      // Check if any tab has changed its request content
      const dirtyTabs = state.tabs.filter(t => {
        const prevTab = prevState.tabs.find(pt => pt.id === t.id);
        if (!prevTab) return false;
        
        // Deep compare request object strictly for changes
        return JSON.stringify(t.request) !== JSON.stringify(prevTab.request);
      });

      if (dirtyTabs.length > 0) {
        this.triggerSave(dirtyTabs);
      }
    });
  }

  private triggerSave(dirtyTabs: any[]) {
    if (this.timeout) {
      window.clearTimeout(this.timeout);
    }

    this.timeout = window.setTimeout(async () => {
      const updateRequest = useCollectionStore.getState().updateRequest;
      
      for (const tab of dirtyTabs) {
        if (tab.collectionId) {
          try {
            await updateRequest(tab.collectionId, tab.id, tab.request);
            console.log(`[AutoSave] Saved request ${tab.id} to collection ${tab.collectionId}`);
          } catch (error) {
            console.error(`[AutoSave] Failed to save request ${tab.id}:`, error);
          }
        }
      }
    }, this.debounceMs);
  }
}

export const autoSaveService = new AutoSaveService();