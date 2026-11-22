import base64
import binascii
from typing import Literal

from pydantic import BaseModel, Field, field_validator, model_validator


class ChatMessage(BaseModel):
    role: Literal["user", "assistant"]
    content: str = Field(min_length=1, max_length=8000)
    image: str | None = Field(default=None, max_length=7_000_000)

    @field_validator("image")
    @classmethod
    def validate_image_data_url(cls, value: str | None) -> str | None:
        if value is None:
            return value
        try:
            header, encoded = value.split(",", 1)
        except ValueError as error:
            raise ValueError("Image must be a base64 data URL.") from error
        if header not in {"data:image/jpeg;base64", "data:image/png;base64", "data:image/webp;base64"}:
            raise ValueError("Only JPEG, PNG, and WebP images are supported.")
        try:
            base64.b64decode(encoded, validate=True)
        except (binascii.Error, ValueError) as error:
            raise ValueError("Image data is not valid base64.") from error
        return value

    @model_validator(mode="after")
    def image_requires_user_role(self) -> "ChatMessage":
        if self.image is not None and self.role != "user":
            raise ValueError("Only user messages can include an image.")
        return self


class ChatRequest(BaseModel):
    messages: list[ChatMessage] = Field(min_length=1, max_length=30)

    @model_validator(mode="after")
    def limit_total_image_size(self) -> "ChatRequest":
        total_size = sum(len(message.image or "") for message in self.messages)
        if total_size > 7_000_000:
            raise ValueError("Attached image data is too large. Remove an earlier image and try again.")
        return self


class ChatResponse(BaseModel):
    message: str