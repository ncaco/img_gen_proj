"""
워크스페이스·플로우 관련 비즈니스 로직
"""
from datetime import datetime, timezone

from sqlalchemy.orm import Session
from sqlalchemy import desc

from app.database.models import Workspace, Flow, User


def workspace_to_response(w: Workspace) -> dict:
    """Workspace 모델 → API 응답 dict (camelCase)"""
    # name이 None이거나 빈 문자열인 경우 기본값 제공
    name = w.name if w.name and w.name.strip() else "새 워크스페이스"
    return {
        "id": w.id,
        "name": name,
        "userId": w.user_id,
        "createdAt": w.created_at.isoformat() if w.created_at else "",
        "updatedAt": w.updated_at.isoformat() if w.updated_at else "",
    }


def flow_to_response(f: Flow) -> dict:
    """Flow 모델 → API 응답 dict (camelCase)"""
    return {
        "id": f.id,
        "workspaceId": f.workspace_id,
        "name": f.name,
        "flowData": f.flow_data,
        "lastAccessedAt": f.last_accessed_at.isoformat() if f.last_accessed_at else None,
        "createdAt": f.created_at.isoformat() if f.created_at else "",
        "updatedAt": f.updated_at.isoformat() if f.updated_at else "",
    }


def list_workspaces_by_user(db: Session, user_id: int) -> list[Workspace]:
    """사용자 소유 워크스페이스 목록 (최신순, 소프트 삭제 제외)"""
    workspaces = (
        db.query(Workspace)
        .filter(Workspace.user_id == user_id, Workspace.deleted_at.is_(None))
        .order_by(desc(Workspace.updated_at))
        .all()
    )
    return workspaces


def get_workspace_by_id(db: Session, workspace_id: int, user_id: int | None = None) -> Workspace | None:
    """워크스페이스 조회. user_id가 있으면 해당 사용자 소유만 허용. 소프트 삭제된 것은 제외."""
    q = db.query(Workspace).filter(Workspace.id == workspace_id, Workspace.deleted_at.is_(None))
    if user_id is not None:
        q = q.filter(Workspace.user_id == user_id)
    return q.first()


def create_workspace(db: Session, user_id: int, name: str) -> Workspace:
    """워크스페이스 생성"""
    w = Workspace(user_id=user_id, name=name.strip())
    db.add(w)
    db.commit()
    db.refresh(w)
    return w


def update_workspace(db: Session, workspace: Workspace, name: str) -> Workspace:
    """워크스페이스 이름 수정"""
    workspace.name = name.strip()
    db.commit()
    db.refresh(workspace)
    return workspace


def delete_workspace(db: Session, workspace: Workspace) -> None:
    """워크스페이스 소프트 삭제 (deleted_at 설정, 레코드는 유지)"""
    workspace.deleted_at = datetime.now(timezone.utc)
    db.commit()


def list_flows_by_workspace(db: Session, workspace_id: int, include_deleted: bool = False) -> list[Flow]:
    """워크스페이스 내 플로우 목록 (마지막 접속 시간 기준 내림차순, 없으면 수정일시 기준)"""
    from sqlalchemy import func
    q = db.query(Flow).filter(Flow.workspace_id == workspace_id)
    if not include_deleted:
        q = q.filter(Flow.deleted_at.is_(None))
    # 마지막 접속 시간이 있으면 그것을 우선, 없으면 수정일시 사용
    # SQLite 호환성을 위해 COALESCE 사용 (NULL이면 updated_at 사용)
    return (
        q.order_by(
            desc(func.coalesce(Flow.last_accessed_at, Flow.updated_at)),
            desc(Flow.updated_at)
        )
        .all()
    )


def get_flow_by_id(db: Session, flow_id: int, workspace_id: int | None = None, include_deleted: bool = False) -> Flow | None:
    """플로우 조회. workspace_id가 있으면 해당 워크스페이스 내만."""
    q = db.query(Flow).filter(Flow.id == flow_id)
    if workspace_id is not None:
        q = q.filter(Flow.workspace_id == workspace_id)
    if not include_deleted:
        q = q.filter(Flow.deleted_at.is_(None))
    return q.first()


def create_flow(db: Session, workspace_id: int, name: str = "새 플로우", flow_data: dict | None = None) -> Flow:
    """플로우 생성"""
    f = Flow(workspace_id=workspace_id, name=name, flow_data=flow_data or {"nodes": [], "edges": []})
    db.add(f)
    db.commit()
    db.refresh(f)
    return f


def update_flow(db: Session, flow: Flow, name: str | None = None, flow_data: dict | None = None, update_last_accessed: bool = False) -> Flow:
    """플로우 수정 (이름·flow_data). update_last_accessed가 True면 마지막 접속 시간 업데이트."""
    if name is not None:
        flow.name = name
    if flow_data is not None:
        flow.flow_data = flow_data
    if update_last_accessed:
        flow.last_accessed_at = datetime.now(timezone.utc)
    db.commit()
    db.refresh(flow)
    return flow


def delete_flow(db: Session, flow: Flow) -> None:
    """플로우 소프트 삭제 (deleted_at 설정, 레코드는 유지)"""
    flow.deleted_at = datetime.now(timezone.utc)
    db.commit()


def get_latest_flow_by_workspace(db: Session, workspace_id: int) -> Flow | None:
    """워크스페이스 내 가장 최근에 접속한 플로우 조회 (소프트 삭제 제외)
    마지막 접속 시간이 있는 플로우를 우선, 없으면 수정일시 기준으로 최신 플로우 반환"""
    from sqlalchemy import func
    return (
        db.query(Flow)
        .filter(Flow.workspace_id == workspace_id, Flow.deleted_at.is_(None))
        .order_by(
            desc(func.coalesce(Flow.last_accessed_at, Flow.updated_at)),
            desc(Flow.updated_at)
        )
        .first()
    )
