# -*- coding: utf-8 -*-
import sys
import re

# Output to file to avoid encoding issues
output_file = r"C:\MYCLAUDE_PROJECT\pdf\backend\problem16_output.txt"

from app.services.hangul import HMLParser

TEST_FILE = r"C:\MYCLAUDE_PROJECT\pdf\.claude\내신 2024년 인천 미추홀구 인화여고 고1 공통 1학기기말 수학상.Hml"
parser = HMLParser(TEST_FILE)
result = parser.parse()

with open(output_file, 'w', encoding='utf-8') as f:
    for p in result.problems:
        if p.number == 16:
            f.write("=== Problem 16 ===\n")
            f.write("content_latex:\n")
            f.write(p.content_latex + "\n\n")
            f.write("content_text:\n")
            f.write(p.content_text + "\n\n")

            # Check for RM patterns
            has_rm = 'RM' in p.content_latex or 'rm' in p.content_latex.lower()
            f.write(f"Has 'RM' or 'rm'?: {has_rm}\n\n")

            # Find RM patterns with context
            rm_matches = re.findall(r'.{0,30}[Rr][Mm].{0,30}', p.content_latex)
            if rm_matches:
                f.write("RM matches in content_latex:\n")
                for m in rm_matches:
                    f.write(f"  [{m}]\n")

            rm_matches2 = re.findall(r'.{0,30}[Rr][Mm].{0,30}', p.content_text)
            if rm_matches2:
                f.write("\nRM matches in content_text:\n")
                for m in rm_matches2:
                    f.write(f"  [{m}]\\n")
            break

print(f"Output written to {output_file}")
