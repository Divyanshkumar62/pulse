# Environment Testing Plan

This document outlines the end-to-end Quality Assurance (QA) strategy for the Environment and Global Variables feature in Pulse.

---

## 1. Environment Management (CRUD)

### 1.1 Creation and Deletion
| Test Case | Steps | Expected Result |
| :--- | :--- | :--- |
| **Create Environment** | 1. Open Environments Panel.<br>2. Click "+ New".<br>3. Enter name "Production" and save. | "Production" appears in the list. Modal closes. |
| **Create Empty Name** | 1. Click "+ New".<br>2. Try to save with empty name or only spaces. | Save button is disabled or action is ignored. |
| **Delete Environment** | 1. Right-click an environment.<br>2. Select "Delete".<br>3. Confirm in the danger modal. | Environment is removed. Active environment falls back to the first available (or null). |

### 1.2 Context Menu Actions
| Test Case | Steps | Expected Result |
| :--- | :--- | :--- |
| **Rename Environment** | 1. Right-click > "Rename".<br>2. Type "Staging-New" and press Enter. | Name updates immediately in the panel and syncs to storage. |
| **Duplicate Environment** | 1. Right-click > "Duplicate". | A new environment named "Original Name (Copy)" appears containing the exact same variables. |
| **Pin / Unpin** | 1. Right-click > "Pin". | A pin icon appears. Pinned environments should float to the top of the list upon refresh/re-render. |

---

## 2. Variable Editing

### 2.1 Editing Interface
| Test Case | Steps | Expected Result |
| :--- | :--- | :--- |
| **Add Variable** | 1. Select an environment.<br>2. In the editor, add a key `API_URL` and value `https://api.com`. | Row is added. Changes auto-save. |
| **Toggle Variable** | 1. Uncheck the checkbox next to a variable. | Variable becomes "disabled" and is ignored during request resolution. |
| **Delete Variable** | 1. Click the trash icon next to a variable row. | Row is removed from the environment. |
| **Mask Secret Values** | 1. Add key `API_KEY` and value `12345`.<br>2. Check if a "secret" toggle/masking feature exists and works. | (If applicable) Value is hidden behind asterisks. |

### 2.2 Global Variables
| Test Case | Steps | Expected Result |
| :--- | :--- | :--- |
| **Access Globals** | 1. Click on the "Globals" item at the top of the Environments panel. | Global Variables editor opens. |
| **Global Precedence** | 1. Add `TOKEN`="GlobalToken" in Globals.<br>2. Add `TOKEN`="LocalToken" in "Development" env.<br>3. Make "Development" active. | Resolving `{{TOKEN}}` should yield "LocalToken" (Local overrides Global). |

---

## 3. Resolution and Integration

### 3.1 Request Execution
| Test Case | Steps | Expected Result |
| :--- | :--- | :--- |
| **URL Resolution** | 1. Set active env with `host`="google.com".<br>2. Make request to `https://{{host}}`. | Request succeeds to google.com. |
| **Header Resolution** | 1. Add header `Authorization: Bearer {{api_token}}`.<br>2. Send request. | Variable is successfully injected into the headers. |
| **Body Resolution** | 1. Create a JSON body with `{"user": "{{username}}"}`.<br>2. Send request. | The backend mock/server receives the resolved username. |

### 3.2 Script Integration
| Test Case | Steps | Expected Result |
| :--- | :--- | :--- |
| **Pre-request Script** | 1. Run script `pm.environment.set("temp", "123")`.<br>2. Use `{{temp}}` in request. | "123" is injected. The variable is persisted in the environment. |
| **Get Variable in Script** | 1. Run script `console.log(pm.environment.get("host"))`. | Logs the correct host variable. |

---

## 4. Edge Cases

- **Circular References:** Variable `A` points to `{{B}}`, and `B` points to `{{A}}`. App should not infinite loop (must have max recursion depth).
- **Missing Variables:** Using `{{does_not_exist}}` should pass the literal string `{{does_not_exist}}` (or fail gracefully).
- **Workspace Isolation:** Verify that environments created in Workspace A do not leak into Workspace B.
