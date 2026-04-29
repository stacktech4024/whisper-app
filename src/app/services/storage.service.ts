import { Injectable } from '@angular/core';
import * as AWS from 'aws-sdk';

@Injectable({
  providedIn: 'root',
})
export class StorageService {
  private s3: AWS.S3;

  constructor() {
    this.s3 = new AWS.S3({
      endpoint: 'https://48542468def7edf8c67eabac2fa189a4.r2.cloudflarestorage.com',
      credentials: {
        accessKeyId: '9ce85c4035a7cf444071e51005ce1c31',
        secretAccessKey: '09d92d176457f9a0360d0a59a87e4e93740f34909b90bf5bf55ef74a5cb0a954',
      },
      region: 'auto',
      s3ForcePathStyle: true,
      signatureVersion: 'v4',
    });
  }

  async uploadAvatar(file: File, userId: string): Promise<string> {
    const extension = file.name.split('.').pop() || 'jpg';
    const key = `avatars/${userId}/avatar.${extension}`;

    const params: AWS.S3.PutObjectRequest = {
      Bucket: 'whisperapp-avatars',
      Key: key,
      Body: file,
      ContentType: file.type,
      ACL: 'public-read',
    };

    const result = await this.s3.upload(params).promise();
    return result.Location;
  }

  /**
   * Generates a signed URL valid for 1 hour to read the object.
   */
  async getAvatarUrl(key: string): Promise<string> {
    const params: AWS.S3.GetObjectRequest & { Expires: number } = {
      Bucket: 'whisperapp-avatars',
      Key: key,
      Expires: 3600,  // valid for 1 hour
    };
    return this.s3.getSignedUrlPromise('getObject', params);
  }
}
