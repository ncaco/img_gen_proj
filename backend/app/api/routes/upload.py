"""
파일 업로드 관련 API 라우터
"""
from fastapi import APIRouter, UploadFile, File, HTTPException
from fastapi.responses import FileResponse
from typing import List, Optional
from pathlib import Path
from app.utils.file_utils import save_uploaded_file, get_file_path_from_url, delete_file
from app.core.config import settings
from pydantic import BaseModel


router = APIRouter(prefix="/upload", tags=["upload"])


class UploadResponse(BaseModel):
    """파일 업로드 응답 스키마"""
    success: bool
    message: str
    file_url: Optional[str] = None
    filename: Optional[str] = None


class MultipleUploadResponse(BaseModel):
    """다중 파일 업로드 응답 스키마"""
    success: bool
    message: str
    files: List[dict] = []


@router.post("/single", response_model=UploadResponse)
async def upload_single_file(
    file: UploadFile = File(...),
    subdirectory: Optional[str] = None
):
    """
    단일 파일 업로드
    
    - **file**: 업로드할 파일
    - **subdirectory**: 서브디렉토리 (선택, 예: "cards", "characters")
    
    허용된 파일 형식: jpg, jpeg, png, gif, webp, svg
    최대 파일 크기: 10MB
    """
    try:
        file_url, file_path = await save_uploaded_file(file, subdirectory)
        
        return UploadResponse(
            success=True,
            message="파일이 성공적으로 업로드되었습니다.",
            file_url=file_url,
            filename=file_path.name
        )
    
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"파일 업로드 중 오류가 발생했습니다: {str(e)}"
        )


@router.post("/multiple", response_model=MultipleUploadResponse)
async def upload_multiple_files(
    files: List[UploadFile] = File(...),
    subdirectory: Optional[str] = None
):
    """
    다중 파일 업로드
    
    - **files**: 업로드할 파일 목록
    - **subdirectory**: 서브디렉토리 (선택)
    
    허용된 파일 형식: jpg, jpeg, png, gif, webp, svg
    최대 파일 크기: 10MB (파일당)
    """
    uploaded_files = []
    errors = []
    
    for file in files:
        try:
            file_url, file_path = await save_uploaded_file(file, subdirectory)
            uploaded_files.append({
                "filename": file.filename,
                "saved_filename": file_path.name,
                "file_url": file_url,
                "success": True
            })
        except HTTPException as e:
            errors.append({
                "filename": file.filename,
                "error": e.detail,
                "success": False
            })
        except Exception as e:
            errors.append({
                "filename": file.filename,
                "error": str(e),
                "success": False
            })
    
    if not uploaded_files and errors:
        raise HTTPException(
            status_code=400,
            detail=f"모든 파일 업로드에 실패했습니다. {errors[0].get('error', '알 수 없는 오류')}"
        )
    
    return MultipleUploadResponse(
        success=len(uploaded_files) > 0,
        message=f"{len(uploaded_files)}개 파일이 업로드되었습니다." + (f" ({len(errors)}개 실패)" if errors else ""),
        files=uploaded_files + errors
    )


@router.get("/file/{file_path:path}")
async def get_file(file_path: str):
    """
    업로드된 파일 조회/다운로드
    
    - **file_path**: 파일 경로 (예: cards/image.jpg 또는 characters/char1.png)
    """
    try:
        # 전체 경로 구성
        full_path = settings.upload_path / file_path
        
        # 보안: 업로드 디렉토리 밖의 파일 접근 방지
        if not str(full_path.resolve()).startswith(str(settings.upload_path.resolve())):
            raise HTTPException(status_code=403, detail="접근이 거부되었습니다.")
        
        if not full_path.exists():
            raise HTTPException(status_code=404, detail="파일을 찾을 수 없습니다.")
        
        return FileResponse(
            path=full_path,
            filename=full_path.name,
            media_type="application/octet-stream"
        )
    
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"파일 조회 중 오류가 발생했습니다: {str(e)}"
        )


@router.delete("/file/{file_path:path}")
async def delete_uploaded_file(file_path: str):
    """
    업로드된 파일 삭제
    
    - **file_path**: 파일 경로 (예: cards/image.jpg)
    """
    try:
        # 전체 경로 구성
        full_path = settings.upload_path / file_path
        
        # 보안: 업로드 디렉토리 밖의 파일 접근 방지
        if not str(full_path.resolve()).startswith(str(settings.upload_path.resolve())):
            raise HTTPException(status_code=403, detail="접근이 거부되었습니다.")
        
        if not full_path.exists():
            raise HTTPException(status_code=404, detail="파일을 찾을 수 없습니다.")
        
        success = delete_file(full_path)
        
        if success:
            return {"success": True, "message": "파일이 성공적으로 삭제되었습니다."}
        else:
            raise HTTPException(status_code=500, detail="파일 삭제에 실패했습니다.")
    
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"파일 삭제 중 오류가 발생했습니다: {str(e)}"
        )
