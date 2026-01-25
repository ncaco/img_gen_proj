"""
파일 관련 유틸리티 함수
"""
import uuid
from pathlib import Path
from typing import Optional
from fastapi import UploadFile, HTTPException
from app.core.config import settings


def ensure_upload_dir() -> Path:
    """
    업로드 디렉토리가 존재하는지 확인하고 없으면 생성
    
    Returns:
        Path: 업로드 디렉토리 경로
    """
    settings.upload_path.mkdir(parents=True, exist_ok=True)
    return settings.upload_path


def get_file_extension(filename: str) -> str:
    """
    파일명에서 확장자 추출
    
    Args:
        filename: 파일명
        
    Returns:
        str: 확장자 (소문자)
    """
    return Path(filename).suffix.lstrip(".").lower()


def is_allowed_file(filename: str) -> bool:
    """
    허용된 파일 확장자인지 확인
    
    Args:
        filename: 파일명
        
    Returns:
        bool: 허용 여부
    """
    extension = get_file_extension(filename)
    return extension in settings.allowed_extensions_list


def generate_unique_filename(original_filename: str) -> str:
    """
    고유한 파일명 생성
    
    Args:
        original_filename: 원본 파일명
        
    Returns:
        str: 고유한 파일명 (UUID + 원본 확장자)
    """
    extension = get_file_extension(original_filename)
    unique_id = str(uuid.uuid4())
    return f"{unique_id}.{extension}" if extension else unique_id


async def save_uploaded_file(
    file: UploadFile,
    subdirectory: Optional[str] = None
) -> tuple[str, Path]:
    """
    업로드된 파일을 저장
    
    Args:
        file: 업로드된 파일 객체
        subdirectory: 서브디렉토리 (선택)
        
    Returns:
        tuple[str, Path]: (저장된 파일명, 파일 경로)
        
    Raises:
        HTTPException: 파일이 허용되지 않거나 크기 제한을 초과한 경우
    """
    # 파일 확장자 확인
    if not is_allowed_file(file.filename):
        raise HTTPException(
            status_code=400,
            detail=f"허용되지 않는 파일 형식입니다. 허용된 형식: {', '.join(settings.allowed_extensions_list)}"
        )
    
    # 업로드 디렉토리 확인 및 생성
    upload_dir = ensure_upload_dir()
    
    # 서브디렉토리가 있으면 생성
    if subdirectory:
        upload_dir = upload_dir / subdirectory
        upload_dir.mkdir(parents=True, exist_ok=True)
    
    # 고유한 파일명 생성
    unique_filename = generate_unique_filename(file.filename)
    file_path = upload_dir / unique_filename
    
    # 파일 내용 읽기 및 크기 확인
    content = await file.read()
    file_size = len(content)
    
    if file_size > settings.MAX_UPLOAD_SIZE:
        raise HTTPException(
            status_code=400,
            detail=f"파일 크기가 너무 큽니다. 최대 크기: {settings.MAX_UPLOAD_SIZE / 1024 / 1024}MB"
        )
    
    # 파일 저장
    with open(file_path, "wb") as f:
        f.write(content)
    
    # 상대 경로 반환 (API에서 사용할 URL 경로)
    # /data/upload/... 형식으로 반환
    relative_path = file_path.relative_to(settings.upload_path.parent)
    file_url = f"/data/{relative_path.as_posix()}"
    
    return file_url, file_path


def delete_file(file_path: Path) -> bool:
    """
    파일 삭제
    
    Args:
        file_path: 삭제할 파일 경로
        
    Returns:
        bool: 삭제 성공 여부
    """
    try:
        if file_path.exists():
            file_path.unlink()
            return True
        return False
    except Exception:
        return False


def get_file_path_from_url(url: str) -> Optional[Path]:
    """
    URL에서 파일 경로 추출
    
    Args:
        url: 파일 URL (예: /data/upload/image.jpg 또는 http://localhost:8000/data/upload/image.jpg)
        
    Returns:
        Optional[Path]: 파일 경로, 없으면 None
    """
    try:
        if not url:
            return None
            
        # 전체 URL에서 경로 부분만 추출
        if url.startswith("http://") or url.startswith("https://"):
            # http://localhost:8000/data/upload/image.jpg 형식
            from urllib.parse import urlparse
            parsed = urlparse(url)
            url = parsed.path
        
        # URL에서 /data/upload/ 또는 /data/upload 부분 제거
        if url.startswith("/data/upload/"):
            url = url[13:]  # "/data/upload/" 제거
        elif url.startswith("/data/upload"):
            url = url[13:]  # "/data/upload" 제거
        elif url.startswith("/data/"):
            url = url[6:]  # "/data/" 제거
        elif url.startswith("/"):
            url = url[1:]
        
        # upload/... 형식으로 시작하면 제거
        if url.startswith("upload/"):
            url = url[7:]  # "upload/" 제거
        
        # 빈 문자열이면 None 반환
        if not url:
            return None
        
        file_path = settings.upload_path / url
        
        # 보안: 업로드 디렉토리 밖의 파일 접근 방지
        resolved_path = file_path.resolve()
        resolved_upload_path = settings.upload_path.resolve()
        
        if not str(resolved_path).startswith(str(resolved_upload_path)):
            print(f"보안 검사 실패: {resolved_path}가 {resolved_upload_path} 밖에 있음")
            return None
        
        if file_path.exists():
            return file_path
        else:
            print(f"파일이 존재하지 않음: {file_path}")
            return None
    except Exception as e:
        print(f"get_file_path_from_url 오류: {url} - {str(e)}")
        import traceback
        print(traceback.format_exc())
        return None
