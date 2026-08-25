import React from 'react';
import { OfflineSyncBadge } from '../UI/OfflineSyncBadge';
import { ConflictResolutionModal } from '../Modals/ConflictResolutionModal';

export const OfflineStatus: React.FC = () => {
  return (
    <>
      <div 
        style={{
          position: 'fixed',
          bottom: '16px',
          right: '16px',
          zIndex: 9998,
          pointerEvents: 'auto'
        }}
      >
        <OfflineSyncBadge />
      </div>
      <ConflictResolutionModal />
    </>
  );
};
