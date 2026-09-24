import sys  
path = r'src/components/VoiceRecorder.tsx'  
with open(path, 'r', encoding='utf-8') as f:  
    lines = f.readlines()  
if len(lines)  and 'formatTime' in lines[25]:  
    del lines[25:30]  
with open(path, 'w', encoding='utf-8') as f:  
    f.writelines(lines)  
print('Fixed') 
