from functools import lru_cache
import os
from typing import BinaryIO

import boto3
from botocore.exceptions import BotoCoreError, ClientError

from app.core.config import AWS_REGION, AWS_S3_BUCKET, AWS_S3_ENDPOINT_URL, AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY


class ObjectStorageError(Exception):
    """Raised when S3 is not configured or an object operation fails."""


@lru_cache(maxsize=1)
def _s3_client():
    # Compose may inject empty optional credential values; let boto3 continue
    # through its normal credential chain (including task/instance roles).
    for name in ("AWS_ACCESS_KEY_ID", "AWS_SECRET_ACCESS_KEY", "AWS_SESSION_TOKEN"):
        if not os.environ.get(name):
            os.environ.pop(name, None)
    print(f"Creating S3 client with region: {AWS_REGION} and endpoint: {AWS_S3_ENDPOINT_URL} and bucket: {AWS_S3_BUCKET}")
    
    s3 = boto3.client("s3", region_name=AWS_REGION, endpoint_url=AWS_S3_ENDPOINT_URL,
                        aws_access_key_id=AWS_ACCESS_KEY_ID, aws_secret_access_key=AWS_SECRET_ACCESS_KEY)
    create_bucket_if_not_exists(s3, AWS_S3_BUCKET)
    return s3

def create_bucket_if_not_exists(s3, bucket_name: str) -> None:
    try:
        s3.head_bucket(Bucket=bucket_name)
        print(f"Bucket '{bucket_name}' already exists.")
    except ClientError as e:
        error_code = e.response['Error']['Code']
        if error_code == '404':
            print(f"Bucket '{bucket_name}' does not exist. Creating it.")
            try:
                s3.create_bucket(Bucket=bucket_name)
                print(f"Bucket '{bucket_name}' created successfully.")
            except (BotoCoreError, ClientError) as error:
                print(f"Error creating bucket '{bucket_name}': {error}")
                raise ObjectStorageError(f"The S3 bucket '{bucket_name}' could not be created.") from error
        else:
            print(f"Error checking bucket '{bucket_name}': {e}")
            raise ObjectStorageError(f"The S3 bucket '{bucket_name}' could not be accessed.") from e


def _ensure_bucket(s3) -> None:
    create_bucket_if_not_exists(s3, _require_bucket())

def _require_bucket() -> str:
    if not AWS_S3_BUCKET:
        raise ObjectStorageError("S3 storage is not configured. Set AWS_S3_BUCKET.")
    return AWS_S3_BUCKET


def upload_object(key: str, body: bytes | BinaryIO, content_type: str) -> None:
    try:
        print(f"Uploading object to S3 with key: {key}, content type: {content_type}, and size: {len(body) if isinstance(body, bytes) else 'unknown'} bytes")
        s3 = _s3_client()
        _ensure_bucket(s3)
        s3.put_object(
            Bucket=_require_bucket(),
            Key=key,
            Body=body,
            ContentType=content_type,
            ServerSideEncryption="AES256",
        )
    except (BotoCoreError, ClientError) as error:
        print(f"Error uploading object to S3: {error}")
        raise ObjectStorageError("The test result could not be saved to S3.") from error


def delete_object(key: str) -> None:
    try:
        _s3_client().delete_object(Bucket=_require_bucket(), Key=key)
    except (BotoCoreError, ClientError) as error:
        raise ObjectStorageError("The test result could not be removed from S3.") from error


def get_object_body(key: str):
    try:
        s3 = _s3_client()
        _ensure_bucket(s3)
        return s3.get_object(Bucket=_require_bucket(), Key=key)["Body"]
    except (BotoCoreError, ClientError) as error:
        print(f"Error downloading S3 object '{key}' from bucket '{AWS_S3_BUCKET}': {error}")
        raise ObjectStorageError("The test result could not be downloaded from S3.") from error


def create_download_url(key: str, filename: str) -> str:
    try:
        return _s3_client().generate_presigned_url(
            "get_object",
            Params={
                "Bucket": _require_bucket(),
                "Key": key,
                "ResponseContentDisposition": f'attachment; filename="{filename.replace(chr(34), "")}"',
            },
            ExpiresIn=300,
        )
    except (BotoCoreError, ClientError) as error:
        raise ObjectStorageError("A download link could not be created for this test result.") from error