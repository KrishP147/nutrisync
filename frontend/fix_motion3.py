#!/usr/bin/env python3
import os
import re
from pathlib import Path

# Change to src directory
src_dir = Path(__file__).parent / 'src'

# Find all .jsx files
jsx_files = list(src_dir.rglob('*.jsx'))

for file_path in jsx_files:
    with open(file_path, 'r', encoding='utf-8') as f:
        content = f.read()
    
    original = content
    
    # Fix all motion.XXX to Motion.XXX
    content = re.sub(r'<motion\.(\w+)', r'<Motion.\1', content)
    content = re.sub(r'</motion\.(\w+)>', r'</Motion.\1>', content)
    
    if content != original:
        with open(file_path, 'w', encoding='utf-8') as f:
            f.write(content)
        print(f"Fixed {file_path}")

print("Done!")
