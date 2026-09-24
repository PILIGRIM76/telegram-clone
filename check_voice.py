import sys  
with open(r'src/services/voiceService.ts', 'r', encoding='utf-8') as f:  
    content = f.read()  
print('Length:', len(content))  
print(content[:200])  
