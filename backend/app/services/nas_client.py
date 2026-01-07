"""
Synology NAS WebDAV 클라이언트

기능:
- 폴더 목록 조회
- PDF 파일 스트리밍
- 파일 메타데이터 조회

Stage 47: NAS 교재 연동
"""
import httpx
from xml.etree import ElementTree as ET
from typing import List, Optional, AsyncGenerator
from dataclasses import dataclass
from urllib.parse import quote, unquote
from datetime import datetime
import os


@dataclass
class NasFile:
    """NAS 파일/폴더 정보"""
    name: str           # 파일명
    path: str           # 전체 경로
    size: int           # 바이트 (폴더는 0)
    is_dir: bool        # 폴더 여부
    modified: str       # 수정일 (ISO format)


class NasClient:
    """
    Synology NAS WebDAV 클라이언트

    사용법:
        client = NasClient(
            base_url="https://hyeyumedu.synology.me:60006",
            username="hyeyum",
            password="password"
        )
        files = await client.list_folder("/학원/0.수학자료/수학교재")
    """

    def __init__(self, base_url: str, username: str, password: str):
        self.base_url = base_url.rstrip('/')
        self.auth = (username, password)
        self._client: Optional[httpx.AsyncClient] = None

    async def _get_client(self) -> httpx.AsyncClient:
        """HTTP 클라이언트 (재사용)"""
        if self._client is None or self._client.is_closed:
            self._client = httpx.AsyncClient(
                auth=self.auth,
                timeout=30.0,
                verify=True,  # SSL 검증
            )
        return self._client

    async def close(self):
        """클라이언트 종료"""
        if self._client and not self._client.is_closed:
            await self._client.aclose()

    def _encode_path(self, path: str) -> str:
        """경로 URL 인코딩 (한글 지원)"""
        # 각 세그먼트를 개별 인코딩
        parts = path.split('/')
        encoded_parts = [quote(p, safe='') for p in parts if p]
        return '/' + '/'.join(encoded_parts) if encoded_parts else '/'

    def _parse_propfind_response(self, xml_content: str) -> List[NasFile]:
        """PROPFIND 응답 XML 파싱"""
        files = []

        # XML 네임스페이스
        namespaces = {'D': 'DAV:'}

        try:
            root = ET.fromstring(xml_content)

            for response in root.findall('.//D:response', namespaces):
                href = response.find('D:href', namespaces)
                if href is None:
                    continue

                # 경로 디코딩
                path = unquote(href.text or '')

                # propstat에서 속성 추출
                propstat = response.find('D:propstat', namespaces)
                if propstat is None:
                    continue

                prop = propstat.find('D:prop', namespaces)
                if prop is None:
                    continue

                # 폴더 여부
                resourcetype = prop.find('D:resourcetype', namespaces)
                is_dir = resourcetype is not None and \
                         resourcetype.find('D:collection', namespaces) is not None

                # 파일 크기
                content_length = prop.find('D:getcontentlength', namespaces)
                size = int(content_length.text) if content_length is not None and content_length.text else 0

                # 수정일
                last_modified = prop.find('D:getlastmodified', namespaces)
                modified = last_modified.text if last_modified is not None else ''

                # 파일명 추출
                name = path.rstrip('/').split('/')[-1] or '/'

                files.append(NasFile(
                    name=name,
                    path=path,
                    size=size,
                    is_dir=is_dir,
                    modified=modified
                ))
        except ET.ParseError as e:
            print(f"[NAS] XML 파싱 오류: {e}")

        return files

    async def list_folder(self, path: str = '/') -> List[NasFile]:
        """
        폴더 내 파일/폴더 목록 조회

        Args:
            path: 폴더 경로 (예: /학원/0.수학자료/수학교재)

        Returns:
            NasFile 목록
        """
        client = await self._get_client()
        encoded_path = self._encode_path(path)
        url = f"{self.base_url}{encoded_path}"

        # PROPFIND 요청
        response = await client.request(
            method="PROPFIND",
            url=url,
            headers={"Depth": "1"},
        )

        if response.status_code == 207:  # Multi-Status
            files = self._parse_propfind_response(response.text)
            # 첫 번째 항목은 자기 자신이므로 제외
            return files[1:] if files else []
        elif response.status_code == 401:
            raise PermissionError("NAS 인증 실패")
        elif response.status_code == 404:
            raise FileNotFoundError(f"폴더를 찾을 수 없음: {path}")
        else:
            raise Exception(f"NAS 오류: {response.status_code}")

    async def list_pdf_files(
        self,
        path: str = '/',
        recursive: bool = False
    ) -> List[NasFile]:
        """
        PDF 파일만 조회

        Args:
            path: 폴더 경로
            recursive: 하위 폴더 재귀 탐색 여부

        Returns:
            PDF 파일 목록
        """
        pdf_files = []
        items = await self.list_folder(path)

        for item in items:
            if item.is_dir and recursive:
                # 하위 폴더 재귀 탐색
                sub_files = await self.list_pdf_files(item.path, recursive=True)
                pdf_files.extend(sub_files)
            elif not item.is_dir and item.name.lower().endswith('.pdf'):
                pdf_files.append(item)

        return pdf_files

    async def get_file_info(self, path: str) -> Optional[NasFile]:
        """
        파일 메타데이터 조회

        Args:
            path: 파일 경로

        Returns:
            NasFile 또는 None
        """
        client = await self._get_client()
        encoded_path = self._encode_path(path)
        url = f"{self.base_url}{encoded_path}"

        response = await client.request(
            method="PROPFIND",
            url=url,
            headers={"Depth": "0"},
        )

        if response.status_code == 207:
            files = self._parse_propfind_response(response.text)
            return files[0] if files else None
        return None

    async def get_file_stream(
        self,
        path: str,
        range_start: Optional[int] = None,
        range_end: Optional[int] = None
    ) -> AsyncGenerator[bytes, None]:
        """
        파일 스트리밍 (Range 요청 지원)

        Args:
            path: 파일 경로
            range_start: 시작 바이트 (Optional)
            range_end: 끝 바이트 (Optional)

        Yields:
            파일 청크 (bytes)
        """
        client = await self._get_client()
        encoded_path = self._encode_path(path)
        url = f"{self.base_url}{encoded_path}"

        headers = {}
        if range_start is not None:
            if range_end is not None:
                headers["Range"] = f"bytes={range_start}-{range_end}"
            else:
                headers["Range"] = f"bytes={range_start}-"

        async with client.stream("GET", url, headers=headers) as response:
            if response.status_code not in (200, 206):
                raise Exception(f"파일 다운로드 실패: {response.status_code}")

            async for chunk in response.aiter_bytes(chunk_size=64 * 1024):
                yield chunk

    async def get_file_bytes(self, path: str) -> bytes:
        """
        파일 전체 다운로드

        Args:
            path: 파일 경로

        Returns:
            파일 내용 (bytes)
        """
        client = await self._get_client()
        encoded_path = self._encode_path(path)
        url = f"{self.base_url}{encoded_path}"

        response = await client.get(url)

        if response.status_code == 200:
            return response.content
        elif response.status_code == 404:
            raise FileNotFoundError(f"파일을 찾을 수 없음: {path}")
        else:
            raise Exception(f"파일 다운로드 실패: {response.status_code}")


# 싱글톤 인스턴스 (환경변수에서 설정)
_nas_client: Optional[NasClient] = None


def get_nas_client() -> NasClient:
    """NAS 클라이언트 싱글톤"""
    global _nas_client

    if _nas_client is None:
        from app.config import settings

        _nas_client = NasClient(
            base_url=settings.NAS_WEBDAV_URL,
            username=settings.NAS_USERNAME,
            password=settings.NAS_PASSWORD,
        )

    return _nas_client
