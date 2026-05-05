import uuid
from pathlib import Path

import aiofiles

from app.core.config import settings


class StorageService:
    """Abstract storage — swaps local ↔ S3 via config."""

    async def upload(self, content: bytes, original_filename: str) -> str:
        ext = Path(original_filename).suffix
        key = f"uploads/{uuid.uuid4()}{ext}"

        if settings.storage_backend == "local":
            return await self._upload_local(content, key)
        return await self._upload_s3(content, key)

    async def get_path(self, storage_key: str) -> str:
        if settings.storage_backend == "local":
            return str(Path(settings.local_upload_dir) / storage_key)
        return await self._get_s3_presigned_url(storage_key)

    async def _upload_local(self, content: bytes, key: str) -> str:
        dest = Path(settings.local_upload_dir) / key
        dest.parent.mkdir(parents=True, exist_ok=True)
        async with aiofiles.open(dest, "wb") as f:
            await f.write(content)
        return key

    async def _upload_s3(self, content: bytes, key: str) -> str:
        import boto3
        s3 = boto3.client(
            "s3",
            aws_access_key_id=settings.aws_access_key_id,
            aws_secret_access_key=settings.aws_secret_access_key,
            region_name=settings.aws_region,
        )
        s3.put_object(Bucket=settings.aws_bucket_name, Key=key, Body=content)
        return key

    async def _get_s3_presigned_url(self, key: str) -> str:
        import boto3
        s3 = boto3.client(
            "s3",
            aws_access_key_id=settings.aws_access_key_id,
            aws_secret_access_key=settings.aws_secret_access_key,
            region_name=settings.aws_region,
        )
        return s3.generate_presigned_url("get_object", Params={"Bucket": settings.aws_bucket_name, "Key": key}, ExpiresIn=3600)
