import { Header } from '../types';
import { sendRequest } from '../hooks/useTauri';
import { useSettingsStore } from '../stores/useSettingsStore';

export const INTROSPECTION_QUERY = `
  query IntrospectionQuery {
    __schema {
      queryType { name }
      mutationType { name }
      subscriptionType { name }
      types {
        ...FullType
      }
      directives {
        name
        description
        locations
        args {
          ...InputValue
        }
      }
    }
  }

  fragment FullType on __Type {
    kind
    name
    description
    fields(includeDeprecated: true) {
      name
      description
      args {
        ...InputValue
      }
      type {
        ...TypeRef
      }
      isDeprecated
      deprecationReason
    }
    inputFields {
      ...InputValue
    }
    interfaces {
      ...TypeRef
    }
    enumValues(includeDeprecated: true) {
      name
      description
      isDeprecated
      deprecationReason
    }
    possibleTypes {
      ...TypeRef
    }
  }

  fragment InputValue on __InputValue {
    name
    description
    type { ...TypeRef }
    defaultValue
  }

  fragment TypeRef on __Type {
    kind
    name
    ofType {
      kind
      name
      ofType {
        kind
        name
        ofType {
          kind
          name
          ofType {
            kind
            name
            ofType {
              kind
              name
              ofType {
                kind
                name
                ofType {
                  kind
                  name
                }
              }
            }
          }
        }
      }
    }
  }
`;

export async function fetchIntrospectionSchema(url: string, headers: Header[]) {
  const settings = useSettingsStore.getState().settings;
  if (!settings) throw new Error('Settings not initialized');

  // Convert Header[] to Record<string, string>
  const headerRecord: Record<string, string> = {};
  headers.forEach(h => {
    if (h.key) headerRecord[h.key] = h.value;
  });
  headerRecord['Content-Type'] = 'application/json';

  const response = await sendRequest(
    'POST',
    url,
    headerRecord,
    {
      type: 'json',
      content: JSON.stringify({ query: INTROSPECTION_QUERY })
    },
    settings
  );

  if (response.status >= 200 && response.status < 300) {
    const data = JSON.parse(response.body);
    return data.data;
  }
  
  throw new Error(`Failed to fetch schema: ${response.status} ${response.status_text}`);
}
