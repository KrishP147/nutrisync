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
    
    # Skip if already uses Motion
    if 'motion as Motion' in content:
        continue
    
    # Replace motion imports
    content = content.replace("import { motion } from 'motion/react'", "import { motion as Motion } from 'motion/react'")
    content = content.replace("import { motion, AnimatePresence }", "import { motion as Motion, AnimatePresence }")
    
    # Replace motion element usage
    content = re.sub(r'<motion\.', r'<Motion.', content)
    content = re.sub(r'</motion\.', r'</Motion.', content)
    
    with open(file_path, 'w', encoding='utf-8') as f:
        f.write(content)

print(f"Fixed {len(jsx_files)} files")
