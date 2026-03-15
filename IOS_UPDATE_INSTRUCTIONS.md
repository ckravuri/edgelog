# EdgeLog iOS App Store Resubmission - Complete Update Guide

## Overview of Changes Made
| Issue | File Changed | Change Description |
|-------|--------------|-------------------|
| Guideline 2.1 (Apple Sign-In Bug) | `frontend/src/pages/LoginPage.js` | Enhanced error handling, logging, session token storage |
| Guideline 2.1 (Apple Sign-In Bug) | `backend/server.py` | Better token verification with detailed logging |
| Guideline 3.1.2 (EULA Link) | `frontend/public/terms.html` | NEW FILE - Static Terms of Service page |
| Guideline 3.1.2 (EULA Link) | `frontend/public/privacy.html` | NEW FILE - Static Privacy Policy page |
| Guideline 2.3.2 (Promotional Image) | `premium_promo_1024x1024.png` | NEW FILE - IAP promotional image |

---

## Step 1: Download Updated Files

### Option A: Download individual files from these URLs:

1. **LoginPage.js** (Frontend):
   ```
   https://trade-journal-test.preview.emergentagent.com/api/file/frontend/src/pages/LoginPage.js
   ```
   Or view at: View the file content below

2. **terms.html** (NEW - Public folder):
   ```
   https://trade-journal-test.preview.emergentagent.com/terms.html
   ```

3. **privacy.html** (NEW - Public folder):
   ```
   https://trade-journal-test.preview.emergentagent.com/privacy.html
   ```

4. **Premium Promotional Image** (1024x1024 PNG):
   ```
   https://trade-journal-test.preview.emergentagent.com/premium_promo_1024x1024.png
   ```

---

## Step 2: Update Files in Your Local Project

### 2.1 Replace `frontend/src/pages/LoginPage.js`

Replace your entire LoginPage.js with the content from this server. The key changes are in the `handleAppleLogin` function:

**Key changes made:**
- Added `console.log` statements for debugging
- Changed `redirectURI` from `window.location.origin` to the actual backend URL
- Added session token cookie storage after successful auth
- Better error messages for cancelled sign-ins, network errors, etc.

### 2.2 Add NEW files to `frontend/public/` folder

Copy these 2 new HTML files to your `frontend/public/` folder:
- `terms.html`
- `privacy.html`

You can download them directly:
```bash
cd frontend/public
curl -O https://trade-journal-test.preview.emergentagent.com/terms.html
curl -O https://trade-journal-test.preview.emergentagent.com/privacy.html
```

### 2.3 Backend Update (server.py)

The `verify_apple_identity_token` function in `server.py` was updated with better logging. If your backend is hosted separately, you need to update the function around line 537.

**Key backend change:** Added logging to show what audience/issuer is in the Apple token for debugging.

---

## Step 3: Build New iOS Version

```bash
# Navigate to frontend directory
cd frontend

# Use Node 18
nvm use 18

# Clean build
rm -rf build node_modules/.cache

# Build the app
npm run build

# Sync with Capacitor
npx cap sync ios

# Open in Xcode
npx cap open ios
```

### In Xcode:
1. Select your target device
2. **Product → Clean Build Folder** (Cmd+Shift+K)
3. **Product → Build** (Cmd+B) to verify no errors
4. **Product → Archive** for App Store submission

---

## Step 4: Update App Store Connect

### 4.1 Add EULA/Terms of Service Link

**Option A - In App Description:**
1. Go to **App Store Connect** → Your App → **App Information**
2. Scroll to **Description** field
3. Add at the end:
   ```
   Terms of Service: https://trade-journal-test.preview.emergentagent.com/terms.html
   Privacy Policy: https://trade-journal-test.preview.emergentagent.com/privacy.html
   ```

**Option B - Custom EULA (Recommended):**
1. Go to **App Store Connect** → Your App → **App Information**
2. Scroll to **License Agreement** section
3. Select **Custom App License Agreement**
4. Enter URL: `https://trade-journal-test.preview.emergentagent.com/terms.html`

### 4.2 Update IAP Promotional Image

1. Go to **App Store Connect** → Your App → **Monetization** → **In-App Purchases**
2. Select your Premium subscription product
3. Click **Edit** next to Promotional Image
4. **Delete** the old screenshot image
5. **Upload** new image: `premium_promo_1024x1024.png`

Download image from:
```
https://trade-journal-test.preview.emergentagent.com/premium_promo_1024x1024.png
```

---

## Step 5: Submit for Review

1. In **Xcode Organizer** (Window → Organizer):
   - Select your new archive
   - Click **Distribute App**
   - Choose **App Store Connect**
   - Follow upload prompts

2. In **App Store Connect**:
   - Select the new build
   - Verify all metadata is complete
   - Click **Submit for Review**

---

## File Contents Reference

### LoginPage.js - Key Section (handleAppleLogin function)

```javascript
const handleAppleLogin = async () => {
  setIsLoading(true);
  setError(null);

  try {
    const { SignInWithApple } = await import('@capacitor-community/apple-sign-in');
    
    const options = {
      clientId: 'com.ravuri.edgelog',
      redirectURI: 'https://trade-journal-test.preview.emergentagent.com',
      scopes: 'email name',
      state: Math.random().toString(36).substring(7),
      nonce: Math.random().toString(36).substring(7),
    };

    console.log('Starting Apple Sign-In with options:', options);
    const result = await SignInWithApple.authorize(options);
    console.log('Apple Sign-In result:', JSON.stringify(result));
    
    if (result.response && result.response.identityToken) {
      console.log('Got identity token, sending to backend...');
      const backendResponse = await fetch(`${API}/auth/apple`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          identity_token: result.response.identityToken,
          user_id: result.response.user,
          email: result.response.email,
          name: result.response.givenName 
            ? `${result.response.givenName} ${result.response.familyName || ''}`.trim()
            : null,
        }),
      });

      console.log('Backend response status:', backendResponse.status);
      
      if (!backendResponse.ok) {
        const errorData = await backendResponse.json();
        console.error('Backend error:', errorData);
        throw new Error(errorData.detail || 'Authentication failed');
      }

      const responseData = await backendResponse.json();
      console.log('Auth successful, navigating to home');
      
      // Store the session token for native platforms
      if (responseData.session_token) {
        document.cookie = `session_token=${responseData.session_token}; path=/; max-age=${7 * 24 * 60 * 60}`;
      }
      
      navigate('/', { replace: true });
    } else {
      console.error('No identity token in result:', result);
      throw new Error('Failed to get identity token from Apple');
    }
  } catch (err) {
    console.error('Apple Sign-In error:', err);
    let errorMessage = 'Apple Sign-In failed. Please try again.';
    if (err.message) {
      if (err.message.includes('canceled') || err.message.includes('cancelled')) {
        errorMessage = 'Sign-in was cancelled.';
      } else if (err.message.includes('network')) {
        errorMessage = 'Network error. Please check your connection.';
      } else {
        errorMessage = err.message;
      }
    }
    setError(errorMessage);
  } finally {
    setIsLoading(false);
  }
};
```

---

## Quick Reference Links

| Resource | URL |
|----------|-----|
| Terms of Service | https://trade-journal-test.preview.emergentagent.com/terms.html |
| Privacy Policy | https://trade-journal-test.preview.emergentagent.com/privacy.html |
| Premium Promo Image | https://trade-journal-test.preview.emergentagent.com/premium_promo_1024x1024.png |
| Full LoginPage.js | View on server at `/frontend/src/pages/LoginPage.js` |

---

## Checklist Before Submission

- [ ] Updated `LoginPage.js` with new `handleAppleLogin` function
- [ ] Added `terms.html` to `frontend/public/`
- [ ] Added `privacy.html` to `frontend/public/`
- [ ] Built new iOS version (`npm run build` + `npx cap sync ios`)
- [ ] Uploaded new build to App Store Connect
- [ ] Added EULA link in App Store Connect
- [ ] Replaced promotional image for IAP
- [ ] Submitted for review

---

Last Updated: March 15, 2026
