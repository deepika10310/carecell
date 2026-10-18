from pydantic import BaseModel


class HelloResponse(BaseModel):
    """Response payload returned by the hello endpoint."""

    message: str
