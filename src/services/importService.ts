import { Collection, Folder, Request, KeyValuePair, HttpMethod, AuthConfig, RequestBody } from '../types';
import { v4 as uuidv4 } from 'uuid';

export class ImportService {
  static async importPostmanCollection(jsonString: string): Promise<Collection> {
    try {
      const data = JSON.parse(jsonString);

      if (!data.info || !data.item) {
        throw new Error('Invalid Postman Collection Format');
      }

      const collectionId = uuidv4();
      
      const newCollection: Collection = {
        id: collectionId,
        name: data.info.name || 'Imported Collection',
        description: data.info.description || null,
        requests: [],
        folders: [],
        variables: this.parseVariables(data.variable || []),
      };

      this.processItems(data.item, newCollection.folders, newCollection.requests);

      return newCollection;
    } catch (error: any) {
      console.error('Import error:', error);
      throw new Error('Failed to parse collection: ' + error.message);
    }
  }

  private static processItems(items: any[], folderTarget: Folder[], requestTarget: Request[]) {
    for (const item of items) {
      if (item.item) {
        // It's a folder
        const newFolder: Folder = {
          id: uuidv4(),
          name: item.name || 'New Folder',
          requests: [],
          folders: [],
        };
        this.processItems(item.item, newFolder.folders!, newFolder.requests);
        folderTarget.push(newFolder);
      } else if (item.request) {
        // It's a request
        requestTarget.push(this.parseRequest(item));
      }
    }
  }

  private static parseRequest(item: any): Request {
    const req = item.request;
    
    let url = '';
    if (typeof req.url === 'string') {
      url = req.url;
    } else if (req.url && req.url.raw) {
      url = req.url.raw;
    }

    const headers: KeyValuePair[] = (req.header || []).map((h: any) => ({
      key: h.key || '',
      value: h.value || '',
      description: h.description,
      enabled: h.disabled !== true,
    }));

    let body: RequestBody = { type: 'none', content: '' };
    if (req.body) {
      if (req.body.mode === 'raw') {
        const isJson = req.body.options?.raw?.language === 'json';
        body = { type: isJson ? 'json' : 'raw', content: req.body.raw || '' };
      } else if (req.body.mode === 'urlencoded') {
        const formData = (req.body.urlencoded || []).map((p: any) => `${encodeURIComponent(p.key)}=${encodeURIComponent(p.value)}`).join('&');
        body = { type: 'raw', content: formData };
        headers.push({ key: 'Content-Type', value: 'application/x-www-form-urlencoded', enabled: true });
      } else if (req.body.mode === 'graphql') {
        body = { type: 'graphql', content: req.body.graphql?.query || '', graphql: { query: req.body.graphql?.query || '', variables: req.body.graphql?.variables || '' } };
      }
    }

    let auth: AuthConfig | undefined;
    if (req.auth) {
      if (req.auth.type === 'bearer') {
        const tokenToken = req.auth.bearer?.find((b: any) => b.key === 'token')?.value;
        auth = { type: 'bearer', config: { token: tokenToken || '' } };
      } else if (req.auth.type === 'oauth2') {
        const accessToken = req.auth.oauth2?.find((b: any) => b.key === 'accessToken')?.value;
        auth = { type: 'oauth2', config: { accessToken: accessToken || '', clientId: '', clientSecret: '', authUrl: '', tokenUrl: '', scope: '' } };
      }
    }
    
    let preRequestScript = '';
    let testScript = '';
    
    if (item.event) {
      for (const ev of item.event) {
        if (ev.listen === 'prerequest' && ev.script?.exec) {
          preRequestScript = ev.script.exec.join('\n');
        } else if (ev.listen === 'test' && ev.script?.exec) {
          testScript = ev.script.exec.join('\n');
        }
      }
    }

    return {
      id: uuidv4(),
      name: item.name || 'New Request',
      method: (req.method || 'GET').toUpperCase() as HttpMethod,
      url,
      headers,
      body,
      auth,
      preRequestScript,
      testScript,
    };
  }

  private static parseVariables(postmanVars: any[]): KeyValuePair[] {
    return postmanVars.map((v: any) => ({
      key: v.key || '',
      value: v.value || '',
      description: v.description,
      enabled: v.disabled !== true,
    }));
  }
}
