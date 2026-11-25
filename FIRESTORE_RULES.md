# Firestore Security Rules for ESTATY Call Signaling

## Overview
These rules protect the `calls` collection used for real-time call signaling via Firebase Firestore. The rules ensure:

1. **Users can only read calls they are part of** (caller or receiver)
2. **Users can only create calls where they are the caller**
3. **Users can only update calls they are part of**
4. **Only valid status transitions are allowed**

## Rules

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Calls collection - real-time call signaling
    match /calls/{callId} {
      // Allow users to read calls they are part of (caller or receiver)
      allow read: if request.auth != null 
        && (request.auth.uid == resource.data.callerId 
            || request.auth.uid == resource.data.receiverId);
      
      // Allow users to create calls where they are the caller
      allow create: if request.auth != null 
        && request.auth.uid == request.resource.data.callerId
        && request.resource.data.callerId != request.resource.data.receiverId
        && request.resource.data.status == 'initiated'
        && request.resource.data.callType in ['audio', 'video']
        && request.resource.data.channelName == callId
        && request.time == request.resource.data.createdAt;
      
      // Allow users to update calls they are part of with valid transitions
      allow update: if request.auth != null
        && (request.auth.uid == resource.data.callerId 
            || request.auth.uid == resource.data.receiverId)
        && isValidStatusTransition(resource.data.status, request.resource.data.status)
        && request.resource.data.callerId == resource.data.callerId
        && request.resource.data.receiverId == resource.data.receiverId
        && request.resource.data.channelName == resource.data.channelName
        && request.resource.data.callId == resource.data.callId
        && request.resource.data.callType == resource.data.callType
        && request.time >= resource.data.updatedAt;
      
      // No delete allowed (let TTL or admin handle cleanup)
      allow delete: if false;
    }
    
    // Helper function for valid status transitions
    function isValidStatusTransition(oldStatus, newStatus) {
      return (oldStatus == 'initiated' && newStatus in ['ringing', 'cancelled'])
        || (oldStatus == 'ringing' && newStatus in ['accepted', 'rejected', 'busy', 'missed', 'cancelled'])
        || (oldStatus == 'accepted' && newStatus == 'ended')
        || (oldStatus == 'rejected' && newStatus == 'rejected') // No change allowed
        || (oldStatus == 'busy' && newStatus == 'busy') // No change allowed
        || (oldStatus == 'missed' && newStatus == 'missed') // No change allowed
        || (oldStatus == 'cancelled' && newStatus == 'cancelled') // No change allowed
        || (oldStatus == 'ended' && newStatus == 'ended'); // No change allowed
    }
  }
}
```

## Data Model

### Call Document Structure
```javascript
{
  callId: string,              // Unique call identifier (matches document ID)
  callerId: string,            // User ID of caller
  callerName: string,          // Display name of caller
  receiverId: string,          // User ID of receiver
  receiverName: string,        // Display name of receiver (optional)
  callType: 'audio' | 'video', // Call type
  channelName: string,         // Agora RTC channel name (same as callId)
  propertyId: string|null,     // Associated property ID (optional)
  status: string,              // Current call status
  createdAt: timestamp,        // Server timestamp when created
  updatedAt: timestamp,        // Server timestamp when updated
  answeredAt: timestamp|null,  // When call was answered
  endedAt: timestamp|null,     // When call ended
  rejectReason: string|null    // Reason for rejection (optional)
}
```

### Valid Status Values
- `initiated` - Call created, not yet ringing
- `ringing` - Call is ringing on receiver's device
- `accepted` - Call accepted, connecting to RTC
- `rejected` - Call rejected by receiver
- `busy` - Receiver was busy (in another call)
- `ended` - Call ended normally
- `missed` - Call timed out (no answer after 30s)
- `cancelled` - Call cancelled by caller before answer

## Valid Status Transitions

```
initiated → ringing (auto after creation)
initiated → cancelled (caller cancels)
ringing → accepted (receiver answers)
ringing → rejected (receiver declines)
ringing → busy (receiver in another call)
ringing → missed (30s timeout)
ringing → cancelled (caller cancels)
accepted → ended (either party hangs up)
```

## Deployment

### Via Firebase CLI
```bash
# Install Firebase CLI
npm install -g firebase-tools

# Login
firebase login

# Initialize Firestore (if not done)
firebase init firestore

# Deploy rules
firebase deploy --only firestore:rules
```

### Via Firebase Console
1. Go to Firebase Console > Firestore Database > Rules
2. Paste the rules above
3. Click "Publish"

## Security Considerations

1. **Authentication Required**: All operations require `request.auth != null`
2. **User ID Validation**: Caller/receiver IDs must match authenticated user
3. **Immutable Fields**: `callerId`, `receiverId`, `callId`, `channelName`, `callType` cannot be changed after creation
4. **Timestamp Validation**: Updates must have `updatedAt` >= previous `updatedAt`
5. **Status Validation**: Only valid status transitions allowed
6. **No Delete**: Documents cannot be deleted by clients (use TTL or Cloud Functions for cleanup)

## Testing Rules

Use the Firebase Rules Playground in the Console to test:
- Read as caller
- Read as receiver
- Read as unauthorized user
- Create with valid/invalid data
- Update with valid/invalid transitions

## Production Checklist

- [ ] Replace placeholder config in `src/services/firebaseConfig.js`
- [ ] Deploy Firestore Security Rules
- [ ] Set up Firebase project with Firestore enabled
- [ ] Configure Agora App ID in environment variables
- [ ] Test call flow between two devices
- [ ] Monitor Firestore usage and costs
- [ ] Set up Cloud Function for call document cleanup (TTL)