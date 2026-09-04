from pydantic import BaseModel


class TodayStatusResponse(BaseModel):
    can_clock_in: bool
    can_clock_out: bool
