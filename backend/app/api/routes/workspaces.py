"""
워크스페이스·플로우 API 라우터
"""
from fastapi import APIRouter, Depends, HTTPException, status, Body
from sqlalchemy.orm import Session

from app.database.database import get_db
from app.api.routes.auth import get_current_user_required
from app.schemas.workspace import (
    WorkspaceCreateSchema,
    WorkspaceUpdateSchema,
    WorkspaceResponseSchema,
    WorkspaceListResponseSchema,
    FlowCreateSchema,
    FlowUpdateSchema,
    FlowResponseSchema,
    FlowListResponseSchema,
)
from app.services.workspace_service import (
    workspace_to_response,
    flow_to_response,
    list_workspaces_by_user,
    get_workspace_by_id,
    create_workspace,
    update_workspace,
    delete_workspace,
    list_flows_by_workspace,
    get_flow_by_id,
    create_flow,
    update_flow,
    delete_flow,
)

router = APIRouter(prefix="/workspaces", tags=["workspaces"])


# ----- Workspace -----
@router.get("", response_model=WorkspaceListResponseSchema)
def list_workspaces(
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user_required),
):
    """내 워크스페이스 목록 (로그인 필요)"""
    workspaces = list_workspaces_by_user(db, current_user.id)
    return {
        "success": True,
        "total": len(workspaces),
        "workspaces": [workspace_to_response(w) for w in workspaces],
    }


@router.post("", response_model=WorkspaceResponseSchema, status_code=status.HTTP_201_CREATED)
def create_workspace_endpoint(
    body: WorkspaceCreateSchema,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user_required),
):
    """워크스페이스 생성 (name 생략 시 '새 워크스페이스', 기본 플로우 1개 자동 생성)"""
    name = (body.name and body.name.strip()) or "새 워크스페이스"
    w = create_workspace(db, current_user.id, name)
    create_flow(db, w.id, name=f"{name} 플로우")
    return workspace_to_response(w)


@router.get("/{workspace_id}", response_model=WorkspaceResponseSchema)
def get_workspace(
    workspace_id: int,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user_required),
):
    """워크스페이스 단건 조회"""
    w = get_workspace_by_id(db, workspace_id, current_user.id)
    if not w:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="워크스페이스를 찾을 수 없습니다.")
    return workspace_to_response(w)


@router.patch("/{workspace_id}", response_model=WorkspaceResponseSchema)
def update_workspace_endpoint(
    workspace_id: int,
    body: WorkspaceUpdateSchema,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user_required),
):
    """워크스페이스 이름 수정"""
    w = get_workspace_by_id(db, workspace_id, current_user.id)
    if not w:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="워크스페이스를 찾을 수 없습니다.")
    if body.name is None:
        return workspace_to_response(w)
    w = update_workspace(db, w, body.name)
    return workspace_to_response(w)


@router.delete("/{workspace_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_workspace_endpoint(
    workspace_id: int,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user_required),
):
    """워크스페이스 삭제 (연관 플로우 함께 삭제)"""
    w = get_workspace_by_id(db, workspace_id, current_user.id)
    if not w:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="워크스페이스를 찾을 수 없습니다.")
    delete_workspace(db, w)


# ----- Flows (under workspace) -----
@router.get("/{workspace_id}/flows", response_model=FlowListResponseSchema)
def list_flows(
    workspace_id: int,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user_required),
):
    """워크스페이스 내 플로우 목록"""
    w = get_workspace_by_id(db, workspace_id, current_user.id)
    if not w:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="워크스페이스를 찾을 수 없습니다.")
    flows = list_flows_by_workspace(db, workspace_id)
    return {
        "success": True,
        "total": len(flows),
        "flows": [flow_to_response(f) for f in flows],
    }


@router.post("/{workspace_id}/flows", response_model=FlowResponseSchema, status_code=status.HTTP_201_CREATED)
def create_flow_endpoint(
    workspace_id: int,
    body: FlowCreateSchema | None = Body(None),
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user_required),
):
    """플로우 생성"""
    w = get_workspace_by_id(db, workspace_id, current_user.id)
    if not w:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="워크스페이스를 찾을 수 없습니다.")
    name = (body.name if body else None) or "새 플로우"
    f = create_flow(db, workspace_id, name=name)
    return flow_to_response(f)


@router.get("/{workspace_id}/flows/{flow_id}", response_model=FlowResponseSchema)
def get_flow(
    workspace_id: int,
    flow_id: int,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user_required),
):
    """플로우 단건 조회"""
    w = get_workspace_by_id(db, workspace_id, current_user.id)
    if not w:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="워크스페이스를 찾을 수 없습니다.")
    f = get_flow_by_id(db, flow_id, workspace_id)
    if not f:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="플로우를 찾을 수 없습니다.")
    return flow_to_response(f)


@router.patch("/{workspace_id}/flows/{flow_id}", response_model=FlowResponseSchema)
def update_flow_endpoint(
    workspace_id: int,
    flow_id: int,
    body: FlowUpdateSchema,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user_required),
):
    """플로우 수정 (이름·flowData)"""
    w = get_workspace_by_id(db, workspace_id, current_user.id)
    if not w:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="워크스페이스를 찾을 수 없습니다.")
    f = get_flow_by_id(db, flow_id, workspace_id)
    if not f:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="플로우를 찾을 수 없습니다.")
    f = update_flow(db, f, name=body.name, flow_data=body.flowData)
    return flow_to_response(f)


@router.delete("/{workspace_id}/flows/{flow_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_flow_endpoint(
    workspace_id: int,
    flow_id: int,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user_required),
):
    """플로우 삭제"""
    w = get_workspace_by_id(db, workspace_id, current_user.id)
    if not w:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="워크스페이스를 찾을 수 없습니다.")
    f = get_flow_by_id(db, flow_id, workspace_id)
    if not f:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="플로우를 찾을 수 없습니다.")
    delete_flow(db, f)
