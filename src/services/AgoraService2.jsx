// Import React Hooks
import React, { useRef, useState, useEffect } from 'react';

// Import user interface elements
import {
  SafeAreaView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import Config from 'react-native-config';

// Import components related to obtaining Android device permissions
import { PermissionsAndroid, Platform } from 'react-native';

// Import Agora SDK
import {
  createAgoraRtcEngine,
  ChannelProfileType,
  ClientRoleType,
  IRtcEngine,
  RtcConnection,
  IRtcEngineEventHandler,
} from 'react-native-agora';

// Define basic information
const appId = Config.AGORA_APP_ID;
const token = Config.AGORA_TOKEN;
const channelName = Config.AGORA_CHANNEL_PREFIX;
const localUid = 0; // Local user Uid, no need to modify

const AgoraService2 = () => {
  const agoraEngineRef = useRef(); // IRtcEngine instance
  const [isJoined, setIsJoined] = useState(false); // Whether the local user has joined the channel
  const [remoteUid, setRemoteUid] = useState(0); // Uid of the remote user
  const [message, setMessage] = useState(''); // User prompt message
  const eventHandler = useRef(); // Implement callback functions

  useEffect(() => {
    const init = async () => {
      await setupVoiceSDKEngine();
      setupEventHandler();
    };
    init();
    return () => {
      cleanupAgoraEngine(); // Ensure this is synchronous
    };
  }, []); // Empty dependency array ensures it runs only once

  const setupEventHandler = () => {
    eventHandler.current = {
      onJoinChannelSuccess: () => {
        setMessage('Successfully joined channel: ' + channelName);
        setIsJoined(true);
      },
      onUserJoined: (_connection, uid) => {
        setMessage('Remote user ' + uid + ' joined');
        setRemoteUid(uid);
      },
      onUserOffline: (_connection, uid) => {
        setMessage('Remote user ' + uid + ' left the channel');
        setRemoteUid(uid);
      },
    };
    agoraEngineRef.current?.registerEventHandler(eventHandler.current);
  };

  const setupVoiceSDKEngine = async () => {
    try {
      if (Platform.OS === 'android') { await getPermission(); }
      agoraEngineRef.current = createAgoraRtcEngine();
      const agoraEngine = agoraEngineRef.current;
      await agoraEngine.initialize({ appId: appId });
    } catch (e) {
      console.error(e);
    }
  };

  // Define the join method called after clicking the join channel button
  const join = async () => {
    if (isJoined) {
      return;
    }
    try {
      // Join the channel as a broadcaster
      agoraEngineRef.current?.joinChannel(token, channelName, localUid, {
        // Set channel profile to live broadcast
        channelProfile: ChannelProfileType.ChannelProfileCommunication,
        // Set user role to broadcaster
        clientRoleType: ClientRoleType.ClientRoleBroadcaster,
        // Publish audio collected by the microphone
        publishMicrophoneTrack: true,
        // Automatically subscribe to all audio streams
        autoSubscribeAudio: true,
      });
    } catch (e) {
      console.log(e);
    }
  };

  // Define the leave method called after clicking the leave channel button
  const leave = () => {
    try {
      // Call leaveChannel method to leave the channel
      agoraEngineRef.current?.leaveChannel();
      setRemoteUid(0);
      setIsJoined(false);
      showMessage('Left the channel');
    } catch (e) {
      console.log(e);
    }
  };

  const cleanupAgoraEngine = () => {
    return () => {
      agoraEngineRef.current?.unregisterEventHandler(eventHandler.current);
      agoraEngineRef.current?.release();
    };
  };

  // Render user interface
  return (
    <SafeAreaView style={styles.main}>
      <Text style={styles.head}>Agora RTC SDK Quickstart</Text>
      <View style={styles.btnContainer}>
        <Text onPress={join} style={styles.button}>
          Join Channel
        </Text>

        <Text onPress={leave} style={styles.button}>
          Leave Channel
        </Text>
      </View>
      {isJoined ? (
        <Text>You joined</Text>
      ) : (
        <Text>Join a channel</Text>
      )}
      {isJoined && remoteUid !== 0 ? (
        <Text>{remoteUid} joined</Text>
      ) : (
        <Text>{isJoined ? 'Waiting for remote user to join' : ''}</Text>
      )}
      <View style={styles.messageContainer}>
        <Text style={styles.info}>{message}</Text>
      </View>
      </SafeAreaView>
  );

  // Display information
  function showMessage(msg) {
    setMessage(msg);
  }
};

const styles = StyleSheet.create({
  button: {
    paddingHorizontal: 25,
    paddingVertical: 4,
    fontWeight: 'bold',
    color: '#ffffff',
    backgroundColor: '#0055cc',
    margin: 5,
  },
  main: {
    flex: 1,
    alignItems: 'center',
  },
  btnContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
  },
  head: {
    fontSize: 20,
  },
  messageContainer: {
    position: 'absolute',
    bottom: 20,
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  info: {
    backgroundColor: '#ffffe0',
    paddingHorizontal: 8,
    paddingVertical: 4,
    color: '#0000ff',
    textAlign: 'center',
  },
});

const getPermission = async () => {
  if (Platform.OS === 'android') {
    await PermissionsAndroid.requestMultiple([
      PermissionsAndroid.PERMISSIONS.RECORD_AUDIO,
    ]);
  }
};

export default AgoraService2;