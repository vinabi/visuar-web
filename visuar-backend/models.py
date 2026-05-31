# models.py
from sqlalchemy import Column, ForeignKey, Integer, String, Float, DateTime, Text, Boolean
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from sqlalchemy.ext.declarative import declarative_base

Base = declarative_base()

class User(Base):
    __tablename__ = "users"
    id = Column(Integer, primary_key=True)
    email = Column(String, unique=True)
    full_name = Column(String)
    plan = Column(String, default="free", server_default="free", nullable=False)

    profile = relationship("Profile", back_populates="user", uselist=False,
                           cascade="all, delete-orphan", passive_deletes=True)
    test_results = relationship("TestResult", back_populates="user",
                                cascade="all, delete-orphan", passive_deletes=True,
                                order_by="TestResult.created_at.desc()")
    onboarding_profile = relationship("UserOnboardingProfile", back_populates="user",
                                      uselist=False, cascade="all, delete-orphan",
                                      passive_deletes=True)
    ai_conversations = relationship("AiConversation", back_populates="user",
                                    cascade="all, delete-orphan", passive_deletes=True,
                                    order_by="AiConversation.updated_at.desc()")

class Profile(Base):
    __tablename__ = "profile"
    id = Column(Integer, primary_key=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), unique=True)
    occupation = Column(String)
    average_screen_time = Column(Integer)
    glasses_user = Column(String)
    lens_power = Column(String, nullable=True)
    lighting_environment = Column(String)
    work_environment = Column(String)
    diet_habits = Column(String)
    eye_pain_or_headache = Column(String)
    sleep_hours = Column(Integer)
    medical_history = Column(String, nullable=True)
    smoker = Column(String, nullable=True)
    alcohol_consumption = Column(String, nullable=True)
    exercise_frequency = Column(String, nullable=True)
    water_intake = Column(String, nullable=True)

    user = relationship("User", back_populates="profile")

class UserOnboardingProfile(Base):
    __tablename__ = "user_onboarding_profiles"
    id = Column(Integer, primary_key=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), unique=True)

    # Personal
    age = Column(Integer, nullable=True)
    gender = Column(String(50), nullable=True)
    occupation = Column(String(150), nullable=True)

    # Daily habits
    average_screen_time = Column(String(50), nullable=True)
    sleep_hours = Column(String(50), nullable=True)
    outdoor_activity_hours = Column(String(50), nullable=True)
    water_intake = Column(String(50), nullable=True)
    screen_usage_type = Column(String(100), nullable=True)

    # Vision
    wears_glasses = Column(Boolean, nullable=True)
    wears_contacts = Column(Boolean, nullable=True)
    blurry_vision = Column(Boolean, nullable=True)
    night_vision_difficulty = Column(Boolean, nullable=True)
    vision_focus = Column(String(20), nullable=True)

    # Symptoms
    headaches_after_screen = Column(Boolean, nullable=True)
    dry_or_irritated_eyes = Column(Boolean, nullable=True)
    eye_fatigue = Column(Boolean, nullable=True)

    # Medical history
    has_diabetes = Column(Boolean, nullable=True)
    has_high_blood_pressure = Column(Boolean, nullable=True)
    family_vision_history = Column(Boolean, nullable=True)

    # Preferences
    preferred_language = Column(String(10), nullable=True)
    additional_notes = Column(Text, nullable=True)

    # Tracking
    is_completed = Column(Boolean, default=False, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    user = relationship("User", back_populates="onboarding_profile")


class AiConversation(Base):
    __tablename__ = "ai_conversations"
    id            = Column(Integer, primary_key=True)
    user_id       = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    title         = Column(String(255), default="New Chat")
    message_count = Column(Integer, default=0)
    created_at    = Column(DateTime(timezone=True), server_default=func.now())
    updated_at    = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    user     = relationship("User", back_populates="ai_conversations")
    messages = relationship("AiMessage", back_populates="conversation",
                            cascade="all, delete-orphan", order_by="AiMessage.created_at.asc()")


class AiMessage(Base):
    __tablename__ = "ai_messages"
    id              = Column(Integer, primary_key=True)
    conversation_id = Column(Integer, ForeignKey("ai_conversations.id", ondelete="CASCADE"), nullable=False)
    user_id         = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    role            = Column(String(20), nullable=False)
    content         = Column(Text, nullable=False)
    extra_data      = Column("metadata", Text, nullable=True)   # 'metadata' is reserved by SQLAlchemy
    created_at      = Column(DateTime(timezone=True), server_default=func.now())

    conversation = relationship("AiConversation", back_populates="messages")


class TestResult(Base):
    __tablename__ = "test_results"
    id = Column(Integer, primary_key=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"))
    test_type = Column(String, default="snellen-acuity")
    left_eye_acuity = Column(String, nullable=True)
    right_eye_acuity = Column(String, nullable=True)
    left_eye_diopter = Column(Float, nullable=True)
    right_eye_diopter = Column(Float, nullable=True)
    result_json = Column(Text, nullable=True)
    overall_score = Column(Integer, default=0)
    ai_findings = Column(Text, nullable=True)
    ai_recommendations = Column(Text, nullable=True)
    ai_summary = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    user = relationship("User", back_populates="test_results")