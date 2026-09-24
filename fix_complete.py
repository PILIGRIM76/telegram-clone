import sys  
path = r'src/services/voiceService.ts'  
with open(path, 'r', encoding='utf-8') as f:  
    content = f.read()  
# Clean up  
idx = content.find('  }')  
if idx  
    idx2 = content.find('  }', idx + 1)  
if idx2  
    content = content[:idx2 + 2]  
remaining = '''  
  
'  // Decrypt voice message for playback'  
'  async decryptVoiceMessage('  
'    encryptedBlob: Blob,'  
'    privateKeyHex: string,'  
'    metadata: VoiceMessageMetadata'  
# Find the end of encryptVoiceMessage  
idx = content.find('  }')  
if idx  
    idx2 = content.find('  }', idx + 1)  
if idx2  
    content = content[:idx2 + 2]  
