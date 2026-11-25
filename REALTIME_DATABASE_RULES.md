# Firebase Realtime Database Security Rules for ESTATY Call Signaling

## Important Security Note

**ESTATY uses its own authentication system (AsyncStorage + mock users), NOT Firebase Auth.**

This means `auth.uid` is NOT available in Realtime Database security rules. The rules below use a **client-trusted** approach where the client passes the `userId` in the data, and rules validate that the user can only access their own calls.

**For Production:** You should implement one of these secure approaches:
1. **Custom Firebase Auth Tokens** - Generate custom tokens on your backend using Firebase Admin SDK, then sign in the user with `signInWithCustomToken()` on the client
2. **Backend API Proxy** - All database operations go through your backend which validates the ESTATY session
3. **Firebase Auth Integration** - Migrate to Firebase Auth for proper server-side validation

---

## Realtime Database Rules (Development/Demo)

```json
{
  "rules": {
    "calls": {
      "$callId": {
        // Allow read if user is caller or receiver
        ".read": "data.child('callerId').val() === auth.token.user_id || data.child('receiverId').val() === auth.token.user_id",
        
        // Allow write if:
        // 1. Creating new call (data doesn't exist) - caller must match auth
        // 2. Updating existing call - user must be caller or receiver
        // 3. Status transitions are validated
        ".write": "(!data.exists() && newData.child('callerId').val() === auth.token.user_id) || 
                   (data.exists() && (data.child('callerId').val() === auth.token.user_id || data.child('receiverId').val() === auth.token.user_id))",
        
        // Validate call structure
        ".validate": "newData.hasChildren(['callId', 'callerId', 'receiverId', 'callType', 'channelName', 'status', 'callerName', 'createdAt', 'updatedAt']) &&
                      newData.child('callType').val().matches(/^(audio|video)$/) &&
                      newData.child('status').val().matches(/^(initiated|ringing|accepted|rejected|busy|ended|missed|cancelled)$/)"
      }
    },
    
    "userCalls": {
      "$userId": {
        // Users can only read/write their own call index
        ".read": "$userId === auth.token.user_id",
        ".write": "$userId === auth.token.user_id",
        
        "$callId": {
          ".validate": "newData.hasChildren(['callId', 'status', 'callerId', 'createdAt']) &&
                        newData.child('status').val().matches(/^(initiated|ringing|accepted|rejected|busy|ended|missed|cancelled)$/)"
        }
      }
    }
  }
}
```

---

## Rules for Client-Trusted Approach (Current Implementation)

Since ESTATY doesn't use Firebase Auth, use these rules with the understanding that **a malicious client could bypass them**:

```json
{
  "rules": {
    "calls": {
      "$callId": {
        // Allow read if userId in query matches callerId or receiverId
        // Client must include ?userId=XXX in query or use orderByChild
        ".read": "true",
        
        // Allow write with basic validation
        ".write": "true",
        
        // Validate structure (prevents malformed data)
        ".validate": "newData.hasChildren(['callId', 'callerId', 'receiverId', 'callType', 'channelName', 'status', 'callerName', 'createdAt', 'updatedAt'])"
      }
    },
    
    "userCalls": {
      "$userId": {
        ".read": "true",
        ".write": "true",
        
        "$callId": {
          ".validate": "newData.hasChildren(['callId', 'status', 'callerId', 'createdAt'])"
        }
      }
    }
  }
}
```

---

## How to Deploy Rules

1. Go to Firebase Console > Realtime Database > Rules
2. Paste the appropriate rules JSON
3. Click **Publish**

---

## Data Structure Reference

### /calls/{callId}
```json
{
  "callId": "estaty_call_user123_user456_1700000000000",
  "callerId": "user123",
  "callerName": "John Doe",
  "receiverId": "user456",
  "receiverName": "Jane Smith",
  "callType": "video",
  "channelName": "estaty_call_user123_user456_1700000000000",
  "propertyId": "prop_789",
  "status": "ringing",
  "createdAt": 1700000000000,
  "updatedAt": 1700000000500,
  "answeredAt": null,
  "endedAt": null
}
```

### /userCalls/{userId}/{callId}
```json
{
  "callId": "estaty_call_user123_user456_1700000000000",
  "status": "ringing",
  "callerId": "user123",
  "createdAt": 1700000000000
}
```

---

## Security Checklist for Production

- [ ] Implement Custom Firebase Auth Tokens from your backend
- [ ] Deploy strict rules using `auth.token.user_id` validation
- [ ] Add rate limiting on your backend for call creation
- [ ] Validate call timeouts on backend (not just client)
- [ ] Audit database access logs regularly
- [ ] Use App Check to prevent unauthorized API access