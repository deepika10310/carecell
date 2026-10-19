from datetime import date, datetime

from sqlalchemy import Date, DateTime, ForeignKey, Integer, String, Text, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.session import Base
from app.models.user import User


class TestSubmission(Base):
    __tablename__ = "test_submissions"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True)
    doctor_id: Mapped[int | None] = mapped_column(ForeignKey("users.id", ondelete="SET NULL"), nullable=True, index=True)
    test_type: Mapped[str] = mapped_column(String(120))
    test_date: Mapped[date] = mapped_column(Date)
    facility: Mapped[str | None] = mapped_column(String(120), nullable=True)
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)
    original_filename: Mapped[str] = mapped_column(String(255))
    s3_key: Mapped[str] = mapped_column(String(512), unique=True)
    stored_filename: Mapped[str | None] = mapped_column(String(80), nullable=True)
    content_type: Mapped[str] = mapped_column(String(100))
    file_size: Mapped[int] = mapped_column(Integer)
    uploaded_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    doctor: Mapped["User | None"] = relationship(foreign_keys=[doctor_id])