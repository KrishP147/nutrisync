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
    
    # Fix lowercase motion to uppercase Motion in closing tags
    content = re.sub(r'</motion\.', r'</Motion.', content)
    content = re.sub(r'</motion>', r'</Motion>', content)
    
    # Fix motion. in self-closing tags to Motion.
    content = re.sub(r'<motion\.([a-z]+)\s', r'<Motion.\1 ', content)
    
    if content != original:
        with open(file_path, 'w', encoding='utf-8') as f:
            f.write(content)
        print(f"Fixed {file_path}")

print("Done!")
