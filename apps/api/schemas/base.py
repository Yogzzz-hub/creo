from pydantic import ConfigDict


class BaseSchema:
    model_config = ConfigDict(from_attributes=True)
