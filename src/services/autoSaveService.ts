import { useTabStore } from '../stores/useTabStore';
import { useCollectionStore } from '../stores/useCollectionStore';

class AutoSaveService {
  private timeout: number | null = null;
  private debounceMs = 2000; // Increased debounce for efficiency

  init() {
    // Subscribe to tab store changes
    useTabStore.subscribe((state) => {
      // Check if any tab is marked as dirty
      const dirtyTabs = state.tabs.filter(t => t.isDirty);

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
      const markTabClean = useTabStore.getState().markTabClean;
      
      for (const tab of dirtyTabs) {
        if (tab.collectionId && tab.request) {
          try {
            await updateRequest(tab.collectionId, tab.id, tab.request);
            markTabClean(tab.id);
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