const { DeleteObjectCommand, GetObjectCommand, PutObjectCommand, S3Client } = require('@aws-sdk/client-s3');
const {
  S3_ACCESS_KEY_ID,
  S3_BUCKET,
  S3_ENDPOINT,
  S3_REGION,
  S3_SECRET_ACCESS_KEY,
} = require('../config/env');

const clientOptions = {
  region: S3_REGION,
  endpoint: S3_ENDPOINT || undefined,
  forcePathStyle: Boolean(S3_ENDPOINT),
};

if (S3_ACCESS_KEY_ID && S3_SECRET_ACCESS_KEY) {
  clientOptions.credentials = {
    accessKeyId: S3_ACCESS_KEY_ID,
    secretAccessKey: S3_SECRET_ACCESS_KEY,
  };
}

const client = new S3Client(clientOptions);

function requireBucket() {
  if (!S3_BUCKET) {
    const error = new Error('S3_BUCKET is not configured.');
    error.status = 503;
    throw error;
  }

  return S3_BUCKET;
}

async function putObject({ key, body, contentType }) {
  await client.send(new PutObjectCommand({
    Bucket: requireBucket(),
    Key: key,
    Body: body,
    ContentType: contentType,
  }));
}

async function getObject(key) {
  return client.send(new GetObjectCommand({
    Bucket: requireBucket(),
    Key: key,
  }));
}

async function deleteObject(key) {
  return client.send(new DeleteObjectCommand({
    Bucket: requireBucket(),
    Key: key,
  }));
}

module.exports = { putObject, getObject, deleteObject };