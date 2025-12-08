# -*- coding: utf-8 -*-
"""Phase 21 API Response Checker"""
import requests
import json

# API 호출
url = "http://localhost:8000/api/hangul/parse"
file_path = r"C:\MYCLAUDE_PROJECT\pdf\.claude\내신 2024년 인천 미추홀구 인화여고 고1 공통 1학기기말 수학상.Hml"

with open(file_path, 'rb') as f:
    response = requests.post(url, files={'file': f})

if response.status_code != 200:
    print(f"Error: {response.status_code}")
    print(response.text)
    exit(1)

data = response.json()

print("=== API Response Structure ===")
print(f"Top-level keys: {list(data.keys())}")
print()

print("=== detected_metadata ===")
dm = data.get('detected_metadata', {})
print(f"Keys: {list(dm.keys())}")
print(f"image_urls: {dm.get('image_urls')}")
print(f"image_count: {dm.get('image_count')}")
print(f"session_id: {dm.get('session_id')}")
print()

print("=== Problems with content_images ===")
for p in data.get('problems', []):
    ci = p.get('content_images', [])
    if ci:
        print(f"Problem {p.get('number')}: content_images = {ci}")

print()
print("=== Check if image API works ===")
image_urls = dm.get('image_urls', {})
if image_urls:
    for bin_id, url in list(image_urls.items())[:1]:
        full_url = f"http://localhost:8000{url}"
        print(f"Testing: {full_url}")
        img_resp = requests.get(full_url)
        print(f"Status: {img_resp.status_code}, Content-Type: {img_resp.headers.get('Content-Type')}, Size: {len(img_resp.content)} bytes")
