 = @'  
import React, { useState, useEffect, useRef, useCallback } from 'react';  
import { voiceService } from '../services/voiceService';  
import { VoiceMessageMetadata, DecryptedVoiceMessage } from '../types';  
  
interface VoicePlayerProps {  
  encryptedBlob: Blob;  
  metadata: VoiceMessageMetadata;  
  privateKeyHex: string;  
  isOwn: boolean;  
}  
  
