import sys  
path = r'src/services/voiceService.ts'  
content = '''import { VoiceMessageMetadata, DecryptedVoiceMessage } from '../types';  
import { encryptFile, decryptFile } from './cryptoService';  
Режим вывода команд на экран (ECHO) включен.
class VoiceService {  
