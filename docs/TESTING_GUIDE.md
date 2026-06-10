# Pulse API Client - Complete Testing Guide

A step-by-step walkthrough to test every feature of Pulse API Client.

---

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Installation](#installation)
3. [Configuration](#configuration)
4. [Initial Setup](#initial-setup)
5. [Feature Testing](#feature-testing)
   - [HTTP Requests](#1-http-requests)
   - [Headers](#2-headers)
   - [Request Body](#3-request-body)
   - [Collections](#4-collections)
   - [Environment Variables](#5-environment-variables)
   - [Request History](#6-request-history)
   - [Postman Import](#7-postman-import)
   - [Team Collaboration](#8-team-collaboration)
   - [User Settings](#9-user-settings)
6. [Test APIs Reference](#test-apis-reference)
7. [Troubleshooting](#troubleshooting)

---

## Prerequisites

### Required Software

| Software | Version | Download |
|----------|---------|----------|
| Node.js | 18+ | [nodejs.org](https://nodejs.org) |
| Rust | 1.70+ | [rust-lang.org](https://rust-lang.org) |
| npm | Comes with Node.js | - |
| Git | Any recent version | [git-scm.com](https://git-scm.com) |

### Verify Installations

Open a terminal and run:

```bash
# Check Node.js
node --version
# Expected: v18.x.x or higher

# Check npm
npm --version
# Expected: 9.x.x or higher

# Check Rust
rustc --version
# Expected: rustc 1.70.0 or higher

# Check Cargo
cargo --version
# Expected: cargo 1.70.0 or higher
```

---

## Installation

### Step 1: Clone or Download the Project

If you have the project already, navigate to it:

```bash
cd C:\dungeon\pulse\pulse-code
```

Or clone from Git (when available):

```bash
git clone https://github.com/YOUR_USERNAME/pulse.git
cd pulse
```

### Step 2: Install Frontend Dependencies

```bash
npm install
```

Expected output:
```
added 150 packages in 10s
```

### Step 3: Build Rust Backend

```bash
cd src-tauri
cargo build
cd ..
```

This will download and compile all Rust dependencies. First build takes 5-10 minutes.

Expected output:
```
Compiling pulse v0.1.0
    Finished dev [unoptimized] target(s)
```

### Step 4: Verify Project Structure

```bash
# Should show these directories
ls -la
```

Expected structure:
```
pulse-code/
├── src/                  # React frontend
├── src-tauri/            # Rust backend
├── package.json
├── README.md
└── .env.example
```

---

## Configuration

### Step 1: Copy Environment Template

```bash
# Windows
copy .env.example .env

# Linux/Mac
cp .env.example .env
```

### Step 2: Configure Email (Optional - For Testing Invites)

For now, we'll use **Mock Mode** (emails print to console):

Open `.env` and verify:
```
EMAIL_PROVIDER=mock
EMAIL_API_KEY=
```

**To enable real emails later:**
1. Get API key from [Resend](https://resend.com/api-keys)
2. Edit `.env`:
   ```
   EMAIL_PROVIDER=resend
   EMAIL_API_KEY=re_xxxxxx
   EMAIL_FROM=your@email.com
   ```

### Step 3: Verify Tauri Configuration

Check `src-tauri/tauri.conf.json`:

```json
{
  "productName": "Pulse",
  "version": "0.1.0",
  "bundle": {
    "targets": ["nsis", "msi"]
  }
}
```

---

## Initial Setup

### Step 1: Launch the Application

```bash
npm run tauri dev
```

Expected:
- A new window opens
- Dark themed interface loads
- Window title: "Pulse - API Client"
- Window size: 1200x800 pixels

### Step 2: Verify Initial State

The app should open with:
- ✅ Dark theme (#1a1a2e background)
- ✅ Sidebar with tabs: Collections, History, Env, Teams, ⚙️
- ✅ Empty Collections section
- ✅ Environment selector showing "No Environment"
- ✅ Main area with URL bar, method selector, Send button

---

## Feature Testing

---

### 1. HTTP Requests

#### Test 1.1: Simple GET Request

**Steps:**
1. Ensure method is set to `GET`
2. Enter URL: `https://jsonplaceholder.typicode.com/posts/1`
3. Click **Send**

**Expected Results:**
- Status badge shows `200 OK`
- Time badge shows response time (e.g., "150ms")
- Response body shows JSON with post data:
  ```json
  {
    "userId": 1,
    "id": 1,
    "title": "sunt aut facere...",
    "body": "quia et suscipit..."
  }
  ```

#### Test 1.2: POST Request with Body

**Steps:**
1. Select method `POST`
2. Enter URL: `https://jsonplaceholder.typicode.com/posts`
3. Go to **Body** tab
4. Enter JSON:
   ```json
   {
     "title": "Test Post",
     "body": "This is a test from Pulse",
     "userId": 1
   }
   ```
5. Click **Send**

**Expected Results:**
- Status badge shows `201 Created`
- Response body shows created post with `id: 101`

#### Test 1.3: PUT Request (Update)

**Steps:**
1. Select method `PUT`
2. Enter URL: `https://jsonplaceholder.typicode.com/posts/1`
3. Go to **Body** tab
4. Enter JSON:
   ```json
   {
     "id": 1,
     "title": "Updated Title",
     "body": "Updated body content",
     "userId": 1
   }
   ```
5. Click **Send**

**Expected Results:**
- Status badge shows `200 OK`
- Response body shows updated post

#### Test 1.4: DELETE Request

**Steps:**
1. Select method `DELETE`
2. Enter URL: `https://jsonplaceholder.typicode.com/posts/1`
3. Click **Send**

**Expected Results:**
- Status badge shows `200 OK`
- Response body shows `{}` (empty object)

#### Test 1.5: Error Response

**Steps:**
1. Select method `GET`
2. Enter URL: `https://jsonplaceholder.typicode.com/posts/99999`
3. Click **Send**

**Expected Results:**
- Status badge shows appropriate error status
- Response body shows error message

---

### 2. Headers

#### Test 2.1: Add Custom Header

**Steps:**
1. Ensure **Headers** tab is selected
2. Click **+ Add Header**
3. Enter key: `X-Custom-Header`
4. Enter value: `test-value`
5. Send any request

**Expected Results:**
- Header appears in response headers list

#### Test 2.2: Remove Header

**Steps:**
1. Click **×** button next to a header row
2. Header is removed from the list

#### Test 2.3: Multiple Headers

**Steps:**
1. Add headers:
   - `Authorization`: `Bearer token123`
   - `Accept`: `application/json`
   - `Content-Type`: `application/json`
2. Send a request

**Expected Results:**
- All headers are sent with the request

---

### 3. Request Body

#### Test 3.1: JSON Body

**Steps:**
1. Select `POST` method
2. Go to **Body** tab
3. Enter:
   ```json
   {
     "name": "John Doe",
     "email": "john@example.com",
     "age": 30
   }
   ```
4. Send request

**Expected Results:**
- Body is sent as JSON
- Response confirms data received

#### Test 3.2: Clear Body

**Steps:**
1. Select `GET` method
2. Go to **Body** tab
3. Clear the textarea
4. Send request

**Expected Results:**
- No body sent with GET request

---

### 4. Collections

#### Test 4.1: Create New Collection

**Steps:**
1. Click **+ New Collection** button at bottom of sidebar
2. Enter name: `My Test Collection`
3. Click **Create**

**Expected Results:**
- Collection appears in sidebar
- Collection is selected/active

#### Test 4.2: Save Request to Collection

**Steps:**
1. Make a request (e.g., GET jsonplaceholder/posts/1)
2. Click **Save** button next to Send
3. Enter request name: `Get First Post`
4. Press Enter or click confirm

**Expected Results:**
- Request appears under collection in sidebar
- Shows method badge (GET) and name

#### Test 4.3: Load Request from Collection

**Steps:**
1. Click on a saved request in sidebar

**Expected Results:**
- URL, method, headers, body are all populated
- Ready to send again

#### Test 4.4: Create Multiple Requests

**Steps:**
1. Create 3-4 different requests
2. Organize them in the collection

**Expected Results:**
- All requests appear in sidebar under collection

---

### 5. Environment Variables

#### Test 5.1: Basic Variable Usage

**Steps:**
1. Go to **Env** tab in sidebar
2. Select "Development" environment
3. Add variable:
   - Key: `base_url`
   - Value: `https://jsonplaceholder.typicode.com`
4. Go to main request area
5. Select "Development" in environment dropdown
6. Enter URL: `{{base_url}}/posts/1`
7. Click **Send**

**Expected Results:**
- URL shows resolved value in history
- Request succeeds

#### Test 5.2: Multiple Variables

**Steps:**
1. Add variables to Development environment:
   - `api_key`: `test-key-123`
   - `user_id`: `42`
2. Use them in a POST body:
   ```json
   {
     "apiKey": "{{api_key}}",
     "userId": {{user_id}},
     "data": "test"
   }
   ```
3. Send request

**Expected Results:**
- Variables are replaced before sending
- Request succeeds

#### Test 5.3: Toggle Variable

**Steps:**
1. Add variable `test_var`: `hello`
2. Use `{{test_var}}` in URL
3. Uncheck the variable
4. Send request

**Expected Results:**
- `{{test_var}}` is NOT replaced (remains literal)

#### Test 5.4: Environment Persistence

**Steps:**
1. Add/modify environment variables
2. Close the application
3. Reopen the application
4. Check **Env** tab

**Expected Results:**
- All environment variables are preserved

---

### 6. Request History

#### Test 6.1: Auto-Save to History

**Steps:**
1. Make 5 different requests (GET, POST, PUT, etc.)
2. Go to **History** tab

**Expected Results:**
- All 5 requests appear in history
- Most recent at top
- Shows method, URL, status, time

#### Test 6.2: Reload from History

**Steps:**
1. Click on any history item

**Expected Results:**
- Request is loaded into main area
- Ready to modify and resend

#### Test 6.3: History Persistence

**Steps:**
1. Make a few requests
2. Close application
3. Reopen application
4. Go to **History** tab

**Expected Results:**
- History is preserved
- Can reload old requests

#### Test 6.4: History Limit

**Steps:**
1. Make 101 requests

**Expected Results:**
- Only last 100 requests are kept
- Oldest requests are removed

---

### 7. Postman Import

#### Test 7.1: Import League Collection

**Steps:**
1. Click **📥 Import Postman** button
2. Navigate to project folder
3. Select `league.postman_collection.json`
4. Click Open

**Expected Results:**
- Collection imports successfully
- Appears in sidebar under Collections
- All requests from Postman collection are available

#### Test 7.2: Import Sample Collection

**Steps:**
1. Click **📥 Import Postman**
2. Select `sample-collection.yaml`

**Expected Results:**
- YAML collection imports (auto-detected)
- Requests appear in sidebar

#### Test 7.3: Test Imported Requests

**Steps:**
1. Click on an imported request
2. Verify URL, method, headers are correct
3. Send the request

**Expected Results:**
- Request works correctly
- Response matches expected API behavior

---

### 8. Team Collaboration

#### Test 8.1: Create Team

**Steps:**
1. Go to **Teams** tab
2. Click **Create a Team** (or **+ Create New Team**)
3. Enter team name: `My API Team`
4. Click **Create Team**

**Expected Results:**
- Team is created
- You appear as Owner
- Team shows in Teams list

#### Test 8.2: View Team Details

**Steps:**
1. Click on your team in the Teams list

**Expected Results:**
- Shows team name
- Shows creation date
- Lists all members (just you for now)
- Shows your role as "owner"

#### Test 8.3: Send Invitation (Mock Mode)

**Steps:**
1. Click **+ Invite** button on your team
2. Enter email: `teammate@example.com`
3. Select role: `Member`
4. Add optional message
5. Click **Send Invite**

**Expected Results:**
- Invitation is created
- Console shows email preview (since we're in mock mode)
- Invitation appears in the team's invite list

#### Test 8.4: View Invitations

**Steps:**
1. Click **Invites** tab in Teams section
2. See pending invitation

**Expected Results:**
- Shows team name
- Shows invited email
- Shows role
- Shows expiration date (7 days)

#### Test 8.5: Accept Invitation (Self)

**Steps:**
1. Click **Accept** on an invitation

**Expected Results:**
- Invitation status changes to "accepted"
- User is added to team members
- Invitation moves out of pending

#### Test 8.6: Decline Invitation

**Steps:**
1. Create another invitation
2. Click **Decline**

**Expected Results:**
- Invitation status changes to "declined"
- User is NOT added to team

#### Test 8.7: Create Another Team

**Steps:**
1. Click **+ Create New Team**
2. Enter name: `Second Team`
3. Create

**Expected Results:**
- Second team appears in list
- Can switch between teams

---

### 9. User Settings

#### Test 9.1: Access Settings

**Steps:**
1. Click **⚙️** tab in sidebar

**Expected Results:**
- Settings panel opens
- Shows current name and email

#### Test 9.2: Update Name

**Steps:**
1. Change name to: `Test User`
2. Navigate away (click another tab)
3. Go back to Settings

**Expected Results:**
- Name is saved as `Test User`

#### Test 9.3: Update Email

**Steps:**
1. Change email to: `test@example.com`
2. Navigate away
3. Go back to Settings

**Expected Results:**
- Email is saved as `test@example.com`

#### Test 9.4: Settings Affect Team Invites

**Steps:**
1. Update settings with your name and email
2. Create a team
3. Send an invitation

**Expected Results:**
- Invitation shows your updated name
- Invitation shows your updated email

#### Test 9.5: Timeout Setting

**Steps:**
1. Change timeout to `5` seconds
2. Send a request that takes longer (or use a slow endpoint)

**Expected Results:**
- Request times out after 5 seconds
- Error shows timeout message

#### Test 9.6: Settings Persistence

**Steps:**
1. Modify settings
2. Close application
3. Reopen application
4. Check Settings tab

**Expected Results:**
- All settings are preserved

---

## Test APIs Reference

Use these APIs for testing:

### JSONPlaceholder (Free Fake API)

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/posts` | GET | Get all posts |
| `/posts/1` | GET | Get single post |
| `/posts/1/comments` | GET | Get comments for post |
| `/users` | GET | Get all users |
| `/users/1` | GET | Get single user |
| `/posts` | POST | Create post |
| `/posts/1` | PUT | Update post |
| `/posts/1` | DELETE | Delete post |
| `/photos` | GET | Get photos |
| `/albums` | GET | Get albums |

### Sample Test Scenarios

```javascript
// Test 1: GET with query params
GET https://jsonplaceholder.typicode.com/posts?userId=1

// Test 2: POST with nested JSON
POST https://jsonplaceholder.typicode.com/posts
{
  "title": "Test",
  "body": "Content",
  "userId": 1
}

// Test 3: Headers
GET https://jsonplaceholder.typicode.com/posts/1
Header: Accept: application/json

// Test 4: PUT with full object
PUT https://jsonplaceholder.typicode.com/posts/1
{
  "id": 1,
  "title": "Updated",
  "body": "Body updated",
  "userId": 1
}
```

---

## Troubleshooting

### Application Won't Start

**Symptom:** `npm run tauri dev` fails

**Solutions:**
1. Check Rust is installed: `rustc --version`
2. Rebuild: `cd src-tauri && cargo build`
3. Check for errors in output

### HTTP Requests Failing

**Symptom:** All requests return errors

**Solutions:**
1. Check internet connection
2. Verify URL is correct
3. Try with `http://` instead of `https://` for some APIs
4. Check response body for error details

### Environment Variables Not Working

**Symptom:** `{{variable}}` not being replaced

**Solutions:**
1. Ensure variable is checked (enabled)
2. Ensure you're in the correct environment
3. Check for typos in variable names
4. Variable names are case-sensitive

### Collections Not Saving

**Symptom:** Saved requests disappear

**Solutions:**
1. Check `~/.pulse/` directory exists
2. Verify write permissions
3. Check console for errors

### Import Failing

**Symptom:** Postman import doesn't work

**Solutions:**
1. Ensure file is valid JSON
2. Check file isn't corrupted
3. Try with `sample-collection.yaml` first

### Team Features Not Working

**Symptom:** Can't create teams or send invites

**Solutions:**
1. Check console for email preview (mock mode)
2. Verify `.env` file exists
3. For real emails, configure Resend/SendGrid API key

### Settings Not Saving

**Symptom:** Settings reset on restart

**Solutions:**
1. Check `~/.pulse/settings.json` exists
2. Verify no errors in console
3. Try running as administrator (Windows)

---

## Quick Test Checklist

Use this checklist for quick verification:

```
□ Application launches without errors
□ Dark theme displays correctly
□ GET request works (jsonplaceholder)
□ POST request works (create post)
□ PUT request works (update post)
□ DELETE request works
□ Headers can be added/removed
□ Request body works
□ New collection can be created
□ Requests can be saved to collection
□ Environment variables work
□ History shows requests
□ History persists after restart
□ Postman collection imports
□ Team can be created
□ Invitation can be sent
□ Settings save correctly
```

---

## Expected Test Results Summary

| Feature | Status | Notes |
|---------|--------|-------|
| HTTP GET | ✅ | Working |
| HTTP POST | ✅ | Working |
| HTTP PUT | ✅ | Working |
| HTTP DELETE | ✅ | Working |
| Headers | ✅ | Working |
| Request Body | ✅ | Working |
| Collections | ✅ | Working |
| Environment Variables | ✅ | Working |
| History | ✅ | Working |
| Postman Import | ✅ | Working |
| Team Creation | ✅ | Working |
| Invitations | ✅ | Working (mock mode) |
| User Settings | ✅ | Working |

---

## Support

If you encounter issues not covered here:

1. Check the console/terminal for error messages
2. Check `~/.pulse/` for data files
3. Review `src-tauri/target/debug/` for Rust logs
4. Check GitHub Issues (when available)

---

**Happy Testing! 🎉**
