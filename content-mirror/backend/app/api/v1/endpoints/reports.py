import io
import json

from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import StreamingResponse
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.dependencies import get_current_user
from app.db.database import get_session
from app.models.analysis import Analysis
from app.models.user import User
from app.schemas.analysis import AnalysisResponse

router = APIRouter(prefix="/reports", tags=["reports"])


@router.get("/export/json/{analysis_id}")
async def export_json(
    analysis_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_session),
):
    analysis = await _get_owned_analysis(analysis_id, current_user.id, db)

    payload = AnalysisResponse.model_validate(analysis).model_dump(mode="json")
    content = json.dumps(payload, indent=2, default=str)

    return StreamingResponse(
        io.BytesIO(content.encode()),
        media_type="application/json",
        headers={
            "Content-Disposition": f"attachment; filename=content-mirror-{analysis_id}.json"
        },
    )


@router.get("/export/pdf/{analysis_id}")
async def export_pdf(
    analysis_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_session),
):
    analysis = await _get_owned_analysis(analysis_id, current_user.id, db)
    pdf_bytes = _render_pdf(analysis)

    return StreamingResponse(
        io.BytesIO(pdf_bytes),
        media_type="application/pdf",
        headers={
            "Content-Disposition": f"attachment; filename=content-mirror-{analysis_id}.pdf"
        },
    )


async def _get_owned_analysis(
    analysis_id: str, user_id: str, db: AsyncSession
) -> Analysis:
    result = await db.execute(
        select(Analysis).where(
            Analysis.id == analysis_id,
            Analysis.user_id == user_id,
            Analysis.status == "completed",
        )
    )
    analysis = result.scalar_one_or_none()
    if not analysis:
        raise HTTPException(status_code=404, detail="Analysis not found or not yet complete")
    return analysis


def _render_pdf(analysis: Analysis) -> bytes:
    """Generate a PDF report using WeasyPrint from an inline HTML template."""
    from weasyprint import HTML

    insights_html = ""
    for ins in (analysis.insights or []):
        severity_color = {"high": "#ef4444", "medium": "#f59e0b", "low": "#3b82f6"}.get(
            ins.get("severity", "low"), "#6b7280"
        )
        insights_html += f"""
        <div class="insight">
            <div class="insight-header" style="border-left: 4px solid {severity_color};">
                <strong>{ins.get("problem", "")}</strong>
                <span class="badge" style="background:{severity_color};">{ins.get("severity","").upper()}</span>
            </div>
            <p><strong>Why:</strong> {ins.get("cause", "")}</p>
            <p class="evidence">{ins.get("evidence", "")}</p>
        </div>"""

    recs_html = ""
    for i, rec in enumerate((analysis.recommendations or []), 1):
        recs_html += f"""
        <div class="rec">
            <span class="rec-num">{i}</span>
            <div>
                <strong>{rec.get("title", "")}</strong>
                <p>{rec.get("description", "")}</p>
                {"<p class='example'>→ " + rec.get("example","") + "</p>" if rec.get("example") else ""}
            </div>
        </div>"""

    html = f"""
    <!DOCTYPE html>
    <html>
    <head>
    <meta charset="utf-8">
    <style>
        body {{ font-family: -apple-system, sans-serif; color: #1e293b; padding: 40px; }}
        h1 {{ color: #4f6ef7; font-size: 28px; margin-bottom: 4px; }}
        h2 {{ font-size: 18px; color: #334155; border-bottom: 2px solid #e2e8f0; padding-bottom: 8px; margin-top: 32px; }}
        .meta {{ color: #64748b; font-size: 13px; margin-bottom: 32px; }}
        .scores {{ display: flex; gap: 16px; flex-wrap: wrap; margin-bottom: 24px; }}
        .score-card {{ background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 10px; padding: 16px 24px; min-width: 130px; }}
        .score-label {{ font-size: 11px; text-transform: uppercase; color: #94a3b8; letter-spacing: 0.05em; }}
        .score-value {{ font-size: 26px; font-weight: 700; color: #1e293b; margin-top: 4px; }}
        .insight {{ background: #f8fafc; border-radius: 8px; padding: 14px 16px; margin-bottom: 12px; }}
        .insight-header {{ display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px; padding-left: 12px; }}
        .badge {{ font-size: 10px; padding: 2px 8px; border-radius: 999px; color: white; font-weight: 600; }}
        .evidence {{ font-size: 12px; color: #64748b; font-style: italic; }}
        .rec {{ display: flex; gap: 14px; background: #f8fafc; border-radius: 8px; padding: 14px; margin-bottom: 10px; }}
        .rec-num {{ width: 28px; height: 28px; background: #4f6ef7; color: white; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-weight: 700; font-size: 13px; flex-shrink: 0; }}
        .example {{ font-size: 13px; color: #4f6ef7; font-style: italic; }}
        .footer {{ margin-top: 48px; font-size: 11px; color: #94a3b8; text-align: center; }}
    </style>
    </head>
    <body>
        <h1>Content Mirror — Analysis Report</h1>
        <p class="meta">
            File: <strong>{analysis.filename}</strong> &nbsp;·&nbsp;
            Generated: <strong>{analysis.completed_at.strftime("%B %d, %Y") if analysis.completed_at else "N/A"}</strong>
        </p>

        <h2>Performance Scores</h2>
        <div class="scores">
            <div class="score-card">
                <div class="score-label">Hook Score</div>
                <div class="score-value">{f"{analysis.hook_score:.1f}/10" if analysis.hook_score is not None else "—"}</div>
            </div>
            <div class="score-card">
                <div class="score-label">Pacing</div>
                <div class="score-value" style="font-size:18px;text-transform:capitalize;">{analysis.pacing or "—"}</div>
            </div>
            <div class="score-card">
                <div class="score-label">Audio Quality</div>
                <div class="score-value" style="font-size:18px;text-transform:capitalize;">{analysis.audio_quality or "—"}</div>
            </div>
            <div class="score-card">
                <div class="score-label">Visual Quality</div>
                <div class="score-value" style="font-size:18px;text-transform:capitalize;">{analysis.image_quality or "—"}</div>
            </div>
        </div>

        <h2>Key Insights</h2>
        {insights_html or "<p>No insights generated.</p>"}

        <h2>Recommendations</h2>
        {recs_html or "<p>No recommendations generated.</p>"}

        <div class="footer">Generated by Content Mirror · contentmirror.ai</div>
    </body>
    </html>
    """

    return HTML(string=html).write_pdf()
