import sys  
with open(r'src/components/VoiceRecorder.tsx', 'r', encoding='utf-8') as f:  
    lines = f.readlines()  
# Remove duplicate formatTime at line 26 (index 25)  
if 'const formatTime = useCallback((seconds: number) = in lines[25]:  
    del lines[25:30]  
with open(r'src/components/VoiceRecorder.tsx', 'w', encoding='utf-8') as f:  
    f.writelines(lines)  
print('Fixed')  
path = r'src/components/VoiceRecorder.tsx'  
