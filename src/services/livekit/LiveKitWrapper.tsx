import React from 'react';
import { LiveKitRoom, RoomAudioRenderer } from '@livekit/components-react';
import '@livekit/components-styles';

interface LiveKitWrapperProps {
  children: React.ReactNode;
}

// In a real application, token and url would be fetched from the backend.
// For development and visual testing, we will keep it disabled until requested.
const serverUrl = 'wss://your-livekit-url.livekit.cloud';
const token = 'development-token-placeholder';

export const LiveKitWrapper: React.FC<LiveKitWrapperProps> = ({ children }) => {
  // Toggle this to true when you have a valid local or cloud LiveKit server running
  const isLiveKitEnabled = false;

  if (!isLiveKitEnabled) {
    return <>{children}</>;
  }

  return (
    <LiveKitRoom
      video={false}
      audio={true}
      token={token}
      serverUrl={serverUrl}
      // Use the default LiveKit theme for the components
      data-lk-theme="default"
      style={{ width: '100%', height: '100%' }}
    >
      {/* This renders audio tracks from other participants */}
      <RoomAudioRenderer />
      
      {children}
    </LiveKitRoom>
  );
};
