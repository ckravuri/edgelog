# EdgeLog iOS App Store Resubmission Guide

## Promotional Image for IAP
Download from: **https://trade-journal-app-16.preview.emergentagent.com/premium_promo_1024x1024.png**

- Size: 1024x1024 pixels (PNG)
- Use this in App Store Connect for your Premium subscription IAP

---

## Step 1: Update Your Local Code

Run these commands in your project's `frontend` directory:

```bash
# Navigate to your frontend folder
cd /path/to/your/edgelog/frontend

# Pull the latest changes from the server (if using git)
# OR manually update these files:
```

### Files to Update:

#### 1. `src/pages/LoginPage.js`
Replace the `handleAppleLogin` function (around line 140-192) with this updated version:

```javascript
  const handleAppleLogin = async () => {
    setIsLoading(true);
    setError(null);

    try {
      // Dynamically import the plugin only on iOS
      const { SignInWithApple } = await import('@capacitor-community/apple-sign-in');
      
      // For native iOS apps, we don't need redirectURI or clientId
      // The native Sign in with Apple uses the app's bundle ID automatically
      const options = {
        clientId: 'com.ravuri.edgelog',
        redirectURI: 'https://trade-journal-app-16.preview.emergentagent.com',
        scopes: 'email name',
        state: Math.random().toString(36).substring(7),
        nonce: Math.random().toString(36).substring(7),
      };

      console.log('Starting Apple Sign-In with options:', options);
      const result = await SignInWithApple.authorize(options);
      console.log('Apple Sign-In result:', JSON.stringify(result));
      
      if (result.response && result.response.identityToken) {
        console.log('Got identity token, sending to backend...');
        // Send token to backend for verification
        const backendResponse = await fetch(`${API}/auth/apple`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
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
        
        // Success - navigate to home
        navigate('/', { replace: true });
      } else {
        console.error('No identity token in result:', result);
        throw new Error('Failed to get identity token from Apple');
      }
    } catch (err) {
      console.error('Apple Sign-In error:', err);
      // Provide more specific error messages
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

#### 2. Add Static Pages to `public/` folder
Copy these files to your `public/` folder:
- `terms.html` - Download from: https://trade-journal-app-16.preview.emergentagent.com/terms.html
- `privacy.html` - Download from: https://trade-journal-app-16.preview.emergentagent.com/privacy.html

---

## Step 2: Build the iOS App

```bash
# In your frontend directory
cd frontend

# Make sure you're using Node 18
nvm use 18

# Clean and rebuild
rm -rf build node_modules/.cache
npm run build

# Sync with Capacitor
npx cap sync ios

# Open Xcode
npx cap open ios
```

In Xcode:
1. Select your device/simulator
2. Product → Clean Build Folder
3. Product → Archive (for App Store submission)

---

## Step 3: Update App Store Connect

### 3.1 Add Terms of Service Link
1. Go to **App Store Connect** → **Your App** → **App Information**
2. Scroll to **App Description**
3. Add this line at the end:
   ```
   Terms of Service: https://trade-journal-app-16.preview.emergentagent.com/terms.html
   Privacy Policy: https://trade-journal-app-16.preview.emergentagent.com/privacy.html
   ```

   **OR** (Recommended):
   - Go to **App Information** → scroll to **License Agreement**
   - Select "Custom App License Agreement" 
   - Paste the URL: `https://trade-journal-app-16.preview.emergentagent.com/terms.html`

### 3.2 Update IAP Promotional Image
1. Go to **App Store Connect** → **Your App** → **Monetization** → **In-App Purchases**
2. Select your Premium subscription
3. Click **Edit** next to "Promotional Image"
4. Delete the old screenshot image
5. Upload the new image: `premium_promo_1024x1024.png`
   - Download from: https://trade-journal-app-16.preview.emergentagent.com/premium_promo_1024x1024.png

---

## Step 4: Submit for Review

1. In Xcode, after Archive completes:
   - Window → Organizer
   - Select your archive → Distribute App
   - Follow the prompts for App Store Connect

2. In App Store Connect:
   - Go to your app → select the new build
   - Complete all required metadata
   - Submit for Review

---

## Summary of Changes Made

| Issue | Fix |
|-------|-----|
| Guideline 2.1 - Apple Sign-In Bug | Updated `handleAppleLogin()` with better error handling, logging, and proper redirectURI |
| Guideline 2.3.2 - Promotional Image | New 1024x1024 professional image (not a screenshot) |
| Guideline 3.1.2 - EULA Link | Static `terms.html` page created, add URL to App Store Connect |

---

## Quick Links

- **Terms of Service**: https://trade-journal-app-16.preview.emergentagent.com/terms.html
- **Privacy Policy**: https://trade-journal-app-16.preview.emergentagent.com/privacy.html  
- **Premium Promo Image**: https://trade-journal-app-16.preview.emergentagent.com/premium_promo_1024x1024.png

---

Last Updated: March 15, 2026
